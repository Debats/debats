import { describe, it, expect } from 'vitest'
import { Either, Effect } from 'effect'
import { inviteUserUseCase } from './invite-user'
import { Invitation, createInvitation } from '../entities/invitation'
import { inMemoryUnitOfWork } from '../events/event-store-memory'

const fakeInvitationRepo = {
  findById: () => Effect.succeed(null as Invitation | null),
  findPendingByEmail: () => Effect.succeed(null as Invitation | null),
  findPendingByInviter: () => Effect.succeed([] as Invitation[]),
}

const fakeContributorRepo = {
  ensureExists: () => Effect.succeed(undefined as void),
  existsByEmail: () => Effect.succeed(false),
}

const validParams = {
  contributor: { id: 'inviter-uuid', reputation: 1000 },
  email: 'invitee@example.com',
  name: 'Jean Dupont',
  runUnitOfWork: inMemoryUnitOfWork().run,
  invitationRepo: fakeInvitationRepo,
  contributorRepo: fakeContributorRepo,
}

describe('inviteUserUseCase', () => {
  it('should fail when contributor is null (not authenticated)', async () => {
    const result = await inviteUserUseCase({
      ...validParams,
      contributor: null,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('connecté')
    }
  })

  it('should fail when contributor reputation is below 1000', async () => {
    const result = await inviteUserUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 999 },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('Éloquent')
    }
  })

  it('should fail when email is invalid', async () => {
    const result = await inviteUserUseCase({
      ...validParams,
      email: 'not-an-email',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('invalides')
    }
  })

  it('should fail when name is too short', async () => {
    const result = await inviteUserUseCase({
      ...validParams,
      name: 'A',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('invalides')
    }
  })

  it('should fail when email already has an account', async () => {
    const result = await inviteUserUseCase({
      ...validParams,
      contributorRepo: {
        ...fakeContributorRepo,
        existsByEmail: () => Effect.succeed(true),
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('existe déjà')
    }
  })

  it('should fail when inviter has 5 pending invitations', async () => {
    const pendingInvitations = Array.from({ length: 5 }, (_, i) =>
      createInvitation({
        inviterId: 'inviter-uuid',
        inviteeEmail: `user${i}@example.com`,
        inviteeName: `User ${i}`,
      }),
    )

    const result = await inviteUserUseCase({
      ...validParams,
      invitationRepo: {
        ...fakeInvitationRepo,
        findPendingByInviter: () => Effect.succeed(pendingInvitations),
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('invitations en attente')
    }
  })

  it('should fail when a pending invitation already exists for this email', async () => {
    const existingInvitation = createInvitation({
      inviterId: 'other-inviter',
      inviteeEmail: 'invitee@example.com',
      inviteeName: 'Existing',
    })

    const result = await inviteUserUseCase({
      ...validParams,
      invitationRepo: {
        ...fakeInvitationRepo,
        findPendingByEmail: () => Effect.succeed(existingInvitation),
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('déjà été invitée')
    }
  })

  it('opens the invitation stream, signed by the inviter, and returns it pending', async () => {
    const unit = inMemoryUnitOfWork()
    const result = await inviteUserUseCase({ ...validParams, runUnitOfWork: unit.run })

    expect(Either.isRight(result) && result.right).toMatchObject({
      inviteeEmail: 'invitee@example.com',
      inviteeName: 'Jean Dupont',
      inviterId: 'inviter-uuid',
      status: 'pending',
    })
    expect(unit.journal.all().map((e) => [e.type, e.actorId, e.revision])).toEqual([
      ['InvitationSent', 'inviter-uuid', 1],
    ])
  })
})
