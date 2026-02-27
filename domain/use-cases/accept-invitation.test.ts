import { describe, it, expect } from 'vitest'
import { Either, Effect } from 'effect'
import { acceptInvitationUseCase } from './accept-invitation'
import { Invitation, createInvitation } from '../entities/invitation'

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
  addReputation: () => Effect.succeed(undefined as void),
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

  it('should initialize invitee reputation to half of inviter reputation', async () => {
    let inviteeReputation = 0

    await acceptInvitationUseCase({
      ...baseParams,
      reputationRepo: {
        getReputation: () => Effect.succeed(2000),
        addReputation: (id, amount) => {
          if (id === 'invitee-uuid') inviteeReputation = amount
          return Effect.succeed(undefined as void)
        },
      },
    })

    expect(inviteeReputation).toBe(1000)
  })

  it('should reward inviter with 50 points', async () => {
    let inviterReward = 0

    await acceptInvitationUseCase({
      ...baseParams,
      reputationRepo: {
        getReputation: () => Effect.succeed(2000),
        addReputation: (id, amount) => {
          if (id === 'inviter-uuid') inviterReward = amount
          return Effect.succeed(undefined as void)
        },
      },
    })

    expect(inviterReward).toBe(50)
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

  it('should not give negative reputation to invitee when inviter has 0', async () => {
    let inviteeReputation = -1

    await acceptInvitationUseCase({
      ...baseParams,
      reputationRepo: {
        getReputation: () => Effect.succeed(0),
        addReputation: (id, amount) => {
          if (id === 'invitee-uuid') inviteeReputation = amount
          return Effect.succeed(undefined as void)
        },
      },
    })

    // inviteeReputation should stay -1 (never called)
    expect(inviteeReputation).toBe(-1)
  })
})
