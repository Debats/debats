import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { StoredEvent, UnreadableEvent } from '../events/event-store'
import {
  acceptInvitation,
  isPendingInvitation,
  replayInvitation,
  revokeInvitation,
  sendInvitation,
} from './invitation'

const streamId = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'
const at = (day: string) => new Date(`${day}T10:00:00Z`)

const stored = (
  event: { type: string; payload: unknown },
  revision: number,
  occurredAt: Date,
  actorId: string | null = 'inviter',
): StoredEvent => ({
  ...event,
  streamType: 'invitation',
  streamId,
  revision,
  actorId,
  metadata: {},
  occurredAt,
})

const sent = sendInvitation({ inviteeEmail: 'jean@example.com', inviteeName: 'Jean Dupont' })

describe('replayInvitation', () => {
  it('rebuilds a pending invitation signed by its inviter', () => {
    const state = replayInvitation([stored(sent, 1, at('2024-01-10'))])

    expect(Either.isRight(state) && state.right).toEqual({
      invitation: {
        id: streamId,
        inviterId: 'inviter',
        inviteeEmail: 'jean@example.com',
        inviteeName: 'Jean Dupont',
        status: 'pending',
        createdAt: at('2024-01-10'),
        updatedAt: at('2024-01-10'),
      },
      revokedAt: null,
    })
    expect(Either.isRight(state) && state.right && isPendingInvitation(state.right)).toBe(true)
  })

  it('marks the acceptance with the contributor who joined and its date', () => {
    const state = replayInvitation([
      stored(sent, 1, at('2024-01-10')),
      stored(acceptInvitation('invitee'), 2, at('2024-01-12'), 'invitee'),
    ])

    expect(Either.isRight(state) && state.right?.invitation).toMatchObject({
      status: 'accepted',
      inviteeId: 'invitee',
      updatedAt: at('2024-01-12'),
    })
    expect(Either.isRight(state) && state.right && isPendingInvitation(state.right)).toBe(false)
  })

  it('dates a revocation', () => {
    const state = replayInvitation([
      stored(sent, 1, at('2024-01-10')),
      stored(revokeInvitation(), 2, at('2024-01-10')),
    ])

    expect(Either.isRight(state) && state.right?.revokedAt).toEqual(at('2024-01-10'))
  })

  it('refuses an invitation without an inviter: one always has an inviter', () => {
    const state = replayInvitation([stored(sent, 1, at('2024-01-10'), null)])
    expect(Either.isLeft(state) && state.left).toBeInstanceOf(UnreadableEvent)
  })
})
