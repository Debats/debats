import { describe, it, expect } from 'vitest'
import { Either, Effect } from 'effect'
import { acceptInvitationUseCase } from './accept-invitation'
import { Invitation, createInvitation } from '../entities/invitation'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
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
  acceptByEmail: () => Effect.succeed(undefined as void),
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

  it('should mark invitation as accepted', async () => {
    let acceptedEmail = ''
    let acceptedInviteeId = ''

    const result = await acceptInvitationUseCase({
      ...baseParams,
      invitationRepo: {
        ...fakeInvitationRepo,
        findPendingByEmail: () => Effect.succeed(baseInvitation as Invitation | null),
        acceptByEmail: (email, inviteeId) => {
          acceptedEmail = email
          acceptedInviteeId = inviteeId
          return Effect.succeed(undefined as void)
        },
      },
    })

    expect(Either.isRight(result)).toBe(true)
    expect(acceptedEmail).toBe('invitee@example.com')
    expect(acceptedInviteeId).toBe('invitee-uuid')
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
