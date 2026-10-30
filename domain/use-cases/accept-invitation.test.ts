import { describe, it, expect } from 'vitest'
import { Either, Effect, Layer } from 'effect'
import { acceptInvitationUseCase } from './accept-invitation'
import { createInvitation } from '../entities/entity-test-helpers'
import { Invitation } from '../entities/invitation'
import { invitationStream, invitationSent } from '../aggregates/invitation'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { RunUnitOfWork } from '../events/unit-of-work'
import { DatabaseError } from '../repositories/errors'
import { ContributorRepository } from '../repositories/contributor-repository'
import { InvitationRepository } from '../repositories/invitation-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { deedsIn, grantsIn } from './contributor-test-helpers'
import { runWith } from './command-test-helpers'

const baseInvitation = createInvitation({
  inviterId: 'inviter-uuid',
  inviteeEmail: 'invitee@example.com',
  inviteeName: 'Jean Dupont',
})

/** A journal where the invitation already has its stream, as the inviter sent it */
async function journalWithInvitation() {
  const unit = inMemoryUnitOfWork()
  await Effect.runPromise(
    unit.journal.append(
      invitationStream(baseInvitation.id),
      0,
      [invitationSent({ inviteeEmail: 'invitee@example.com', inviteeName: 'Jean Dupont' })],
      { actorId: 'inviter-uuid' },
    ),
  )
  return unit
}

const noInvitation: InvitationRepository = {
  findById: () => Effect.succeed(null as Invitation | null),
  findPendingByEmail: () => Effect.succeed(null as Invitation | null),
  findPendingByInviter: () => Effect.succeed([] as Invitation[]),
}

const pendingInvitation: InvitationRepository = {
  ...noInvitation,
  findPendingByEmail: () => Effect.succeed(baseInvitation as Invitation | null),
}

const fakeReputationRepo: ReputationRepository = {
  getReputation: () => Effect.succeed(2000),
  getHistory: () => Effect.succeed([]),
}

const fakeContributorRepo: ContributorRepository = {
  findById: () => Effect.succeed(null),
  ensureExists: () => Effect.succeed(undefined as void),
  existsByEmail: () => Effect.succeed(false),
}

const baseParams = {
  inviteeId: 'invitee-uuid',
  inviteeEmail: 'invitee@example.com',
}

/** The read side as the test wants it */
const fakes = (
  overrides: {
    invitations?: InvitationRepository
    reputations?: ReputationRepository
    contributors?: ContributorRepository
  } = {},
) =>
  Layer.mergeAll(
    Layer.succeed(InvitationRepository, overrides.invitations ?? pendingInvitation),
    Layer.succeed(ReputationRepository, overrides.reputations ?? fakeReputationRepo),
    Layer.succeed(ContributorRepository, overrides.contributors ?? fakeContributorRepo),
  )

const execute = runWith(fakes())

describe('acceptInvitationUseCase', () => {
  it('should fail when no pending invitation exists for the email', async () => {
    const result = await runWith(fakes({ invitations: noInvitation }))(
      acceptInvitationUseCase(baseParams),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('invitation')
    }
  })

  it('should create the contributor record', async () => {
    let createdContributorId = ''
    const unit = await journalWithInvitation()

    await runWith(
      fakes({
        contributors: {
          ...fakeContributorRepo,
          ensureExists: (id) => {
            createdContributorId = id
            return Effect.succeed(undefined as void)
          },
        },
      }),
    )(acceptInvitationUseCase(baseParams), unit.run)

    expect(createdContributorId).toBe('invitee-uuid')
  })

  it('accepts the invitation on its stream, signed by the invitee, with the grants', async () => {
    const unit = await journalWithInvitation()

    const result = await execute(acceptInvitationUseCase(baseParams), unit.run)

    expect(Either.isRight(result)).toBe(true)
    expect(deedsIn(unit.journal).map((e) => [e.type, e.actorId, e.payload])).toEqual([
      ['InvitationSent', 'inviter-uuid', expect.anything()],
      ['InvitationAccepted', 'invitee-uuid', { inviteeId: 'invitee-uuid' }],
    ])
  })

  it('refuses a second acceptance: the stream already says it was accepted', async () => {
    const unit = await journalWithInvitation()
    await execute(acceptInvitationUseCase(baseParams), unit.run)

    // The read side may still show it pending: the stream, not the table, decides
    const again = await execute(acceptInvitationUseCase(baseParams), unit.run)

    expect(Either.isLeft(again) && again.left).toContain('déjà été acceptée')
    expect(grantsIn(unit.journal)).toHaveLength(2)
  })

  it('leaves the invitation pending when the grants cannot be written', async () => {
    const unit = await journalWithInvitation()
    const failing: RunUnitOfWork = (work) =>
      unit.run((events) => Effect.andThen(work(events), Effect.fail(new DatabaseError('down'))))

    // A database failure is not a refusal: it surfaces to the action, which reports it
    await expect(execute(acceptInvitationUseCase(baseParams), failing)).rejects.toThrow('down')

    expect(deedsIn(unit.journal).map((e) => e.type)).toEqual(['InvitationSent'])
    expect(grantsIn(unit.journal)).toEqual([])
  })

  it('starts the invitee at half the inviter reputation and rewards the inviter, in one go', async () => {
    const unit = await journalWithInvitation()

    await execute(acceptInvitationUseCase(baseParams), unit.run)

    expect(grantsIn(unit.journal)).toEqual([
      ['invitee-uuid', 'invitation_bonus', 1000],
      ['inviter-uuid', 'invitation_accepted', 50],
    ])
  })

  it('should fail when invitation is expired', async () => {
    const eightDaysAgo = new Date()
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)
    const expiredInvitation: Invitation = {
      ...baseInvitation,
      createdAt: eightDaysAgo,
    }

    const result = await runWith(
      fakes({
        invitations: {
          ...noInvitation,
          findPendingByEmail: () => Effect.succeed(expiredInvitation as Invitation | null),
        },
      }),
    )(acceptInvitationUseCase(baseParams))

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('expiré')
    }
  })

  it('gives the invitee nothing when the inviter has nothing', async () => {
    const unit = await journalWithInvitation()

    await runWith(
      fakes({ reputations: { ...fakeReputationRepo, getReputation: () => Effect.succeed(0) } }),
    )(acceptInvitationUseCase(baseParams), unit.run)

    expect(grantsIn(unit.journal)).toEqual([['inviter-uuid', 'invitation_accepted', 50]])
  })
})
