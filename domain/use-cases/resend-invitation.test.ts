import { describe, it, expect } from 'vitest'
import { Effect, Either } from 'effect'
import { validateResendInvitation } from './resend-invitation'
import { createInvitation } from '../entities/entity-test-helpers'
import { Invitation } from '../entities/invitation'

const baseInvitation = createInvitation({
  inviterId: 'inviter-uuid',
  inviteeEmail: 'invitee@example.com',
  inviteeName: 'Jean Dupont',
})

const fakeInvitationRepo = {
  findById: () => Effect.succeed(null as Invitation | null),
  findPendingByEmail: () => Effect.succeed(null as Invitation | null),
  findPendingByInviter: () => Effect.succeed([] as Invitation[]),
}

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect.pipe(Effect.either))

/** The day these tests judge an expiry on */
const today = new Date('2026-03-15T10:00:00Z')

describe('validateResendInvitation', () => {
  it('should fail when no pending invitation exists for the email', async () => {
    const result = await run(
      validateResendInvitation({
        email: 'unknown@example.com',
        invitationRepo: fakeInvitationRepo,
        today,
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
          findPendingByEmail: () =>
            Effect.succeed({
              ...baseInvitation,
              createdAt: new Date('2026-03-12T10:00:00Z'),
            } as Invitation | null),
        },
        today,
      }),
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.inviteeName).toBe('Jean Dupont')
      expect(result.right.inviteeEmail).toBe('invitee@example.com')
    }
  })

  it('should fail when invitation is expired (>7 days)', async () => {
    const expiredInvitation: Invitation = {
      ...baseInvitation,
      createdAt: new Date('2026-03-06T10:00:00Z'),
    }

    const result = await run(
      validateResendInvitation({
        email: 'invitee@example.com',
        invitationRepo: {
          ...fakeInvitationRepo,
          findPendingByEmail: () => Effect.succeed(expiredInvitation as Invitation | null),
        },
        today,
      }),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('expiré')
    }
  })
})
