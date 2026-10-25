import { describe, it, expect } from 'vitest'
import { Either, Effect } from 'effect'
import { acceptInvitationUseCase } from './accept-invitation'
import { Invitation, createInvitation } from '../entities/invitation'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { RunUnitOfWork } from '../events/unit-of-work'
import { DatabaseError } from '../repositories/errors'
import { grantsIn } from './contributor-test-helpers'

const baseInvitation = createInvitation({
  inviterId: 'inviter-uuid',
  inviteeEmail: 'invitee@example.com',
  inviteeName: 'Jean Dupont',
})

const fakeInvitationRepo = {
  create: (invitation: Invitation) => Effect.succeed(invitation),
  deleteById: () => Effect.succeed(undefined as void),
  findPendingByEmail: () => Effect.succeed(null as Invitation | null),
  findPendingByInviter: () => Effect.succeed([] as Invitation[]),
}

const fakeReputationRepo = {
  getReputation: () => Effect.succeed(2000),
  getHistory: () => Effect.succeed([]),
}

const fakeContributorRepo = {
  ensureExists: () => Effect.succeed(undefined as void),
  existsByEmail: () => Effect.succeed(false),
}

const baseParams = {
  inviteeId: 'invitee-uuid',
  inviteeEmail: 'invitee@example.com',
  invitationRepo: {
    ...fakeInvitationRepo,
    findPendingByEmail: () => Effect.succeed(baseInvitation as Invitation | null),
  },
  reputationRepo: fakeReputationRepo,
  contributorRepo: fakeContributorRepo,
  runUnitOfWork: inMemoryUnitOfWork().run,
}

describe('acceptInvitationUseCase', () => {
  it('should fail when no pending invitation exists for the email', async () => {
    const result = await acceptInvitationUseCase({
      ...baseParams,
      invitationRepo: fakeInvitationRepo,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('invitation')
    }
  })

  it('should create the contributor record', async () => {
    let createdContributorId = ''

    await acceptInvitationUseCase({
      ...baseParams,
      contributorRepo: {
        ...fakeContributorRepo,
        ensureExists: (id) => {
          createdContributorId = id
          return Effect.succeed(undefined as void)
        },
      },
    })

    expect(createdContributorId).toBe('invitee-uuid')
  })

  it('marks the invitation as accepted in the transaction of the grants', async () => {
    const unit = inMemoryUnitOfWork()

    const result = await acceptInvitationUseCase({ ...baseParams, runUnitOfWork: unit.run })

    expect(Either.isRight(result)).toBe(true)
    expect(unit.acceptedInvitations).toEqual([
      { email: 'invitee@example.com', inviteeId: 'invitee-uuid' },
    ])
  })

  it('leaves the invitation pending when the grants cannot be written', async () => {
    const unit = inMemoryUnitOfWork()
    const failing: RunUnitOfWork = (work) =>
      unit.run((events, process) =>
        Effect.andThen(work(events, process), Effect.fail(new DatabaseError('down'))),
      )

    // A database failure is not a refusal: it surfaces to the action, which reports it
    await expect(
      acceptInvitationUseCase({ ...baseParams, runUnitOfWork: failing }),
    ).rejects.toThrow('down')

    expect(unit.acceptedInvitations).toEqual([])
    expect(unit.journal.all()).toEqual([])
  })

  it('starts the invitee at half the inviter reputation and rewards the inviter, in one go', async () => {
    const unit = inMemoryUnitOfWork()

    await acceptInvitationUseCase({ ...baseParams, runUnitOfWork: unit.run })

    expect(grantsIn(unit.journal)).toEqual([
      ['invitee-uuid', 'invitation_bonus', 1000],
      ['inviter-uuid', 'invitation_accepted', 50],
    ])
    expect(unit.journal.all().map((e) => e.actorId)).toEqual(['invitee-uuid', 'invitee-uuid'])
  })

  it('should fail when invitation is expired', async () => {
    const eightDaysAgo = new Date()
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)
    const expiredInvitation: Invitation = {
      ...baseInvitation,
      createdAt: eightDaysAgo,
    }

    const result = await acceptInvitationUseCase({
      ...baseParams,
      invitationRepo: {
        ...fakeInvitationRepo,
        findPendingByEmail: () => Effect.succeed(expiredInvitation as Invitation | null),
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('expiré')
    }
  })

  it('gives the invitee nothing when the inviter has nothing', async () => {
    const unit = inMemoryUnitOfWork()

    await acceptInvitationUseCase({
      ...baseParams,
      reputationRepo: { ...fakeReputationRepo, getReputation: () => Effect.succeed(0) },
      runUnitOfWork: unit.run,
    })

    expect(grantsIn(unit.journal)).toEqual([['inviter-uuid', 'invitation_accepted', 50]])
  })
})
