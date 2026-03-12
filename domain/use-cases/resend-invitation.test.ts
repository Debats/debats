import { describe, it, expect } from 'vitest'
import { Effect, Either } from 'effect'
import { validateResendInvitation } from './resend-invitation'
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

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect.pipe(Effect.either))

describe('validateResendInvitation', () => {
  it('should fail when no pending invitation exists for the email', async () => {
    const result = await run(
      validateResendInvitation({
        email: 'unknown@example.com',
        invitationRepo: fakeInvitationRepo,
      }),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('invitation')
    }
  })

  it('should return the invitation when it exists and is not expired', async () => {
    const result = await run(
      validateResendInvitation({
        email: 'invitee@example.com',
        invitationRepo: {
          ...fakeInvitationRepo,
          findPendingByEmail: () => Effect.succeed(baseInvitation as Invitation | null),
        },
      }),
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.inviteeName).toBe('Jean Dupont')
      expect(result.right.inviteeEmail).toBe('invitee@example.com')
    }
  })

  it('should fail when invitation is expired (>7 days)', async () => {
    const eightDaysAgo = new Date()
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)
    const expiredInvitation: Invitation = {
      ...baseInvitation,
      createdAt: eightDaysAgo,
    }

    const result = await run(
      validateResendInvitation({
        email: 'invitee@example.com',
        invitationRepo: {
          ...fakeInvitationRepo,
          findPendingByEmail: () => Effect.succeed(expiredInvitation as Invitation | null),
        },
      }),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('expiré')
    }
  })
})
