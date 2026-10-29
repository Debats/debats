import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { StoredEvent, UnreadableEvent } from '../events/event-store'
import { Rejected } from './decision'
import {
  acceptInvitation,
  ALREADY_ACCEPTED,
  invitationAccepted,
  invitationRevoked,
  invitationSent,
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

const jean = { inviteeEmail: 'jean@example.com', inviteeName: 'Jean Dupont' }
const sent = invitationSent(jean)

const rebuilt = (...events: Array<{ type: string; payload: unknown }>) => {
  const state = replayInvitation(
    events.map((event, index) => stored(event, index + 1, at(`2024-01-${10 + index}`))),
  )
  if (Either.isLeft(state) || !state.right) throw new Error('expected a state')
  return state.right
}

describe('invitation decisions', () => {
  it('open the stream with the invitation sent', () => {
    expect(sendInvitation(jean)).toEqual([sent])
  })

  it('accept a pending invitation, once', () => {
    expect(acceptInvitation('invitee')(rebuilt(sent))).toEqual(
      Either.right([invitationAccepted('invitee')]),
    )
    expect(acceptInvitation('other')(rebuilt(sent, invitationAccepted('invitee')))).toEqual(
      Either.left(new Rejected(ALREADY_ACCEPTED)),
    )
  })

  it('record a revocation, which nothing in the state can refuse', () => {
    expect(revokeInvitation()(rebuilt(sent))).toEqual(Either.right([invitationRevoked()]))
  })
})

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
      stored(invitationAccepted('invitee'), 2, at('2024-01-12'), 'invitee'),
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
      stored(invitationRevoked(), 2, at('2024-01-10')),
    ])

    expect(Either.isRight(state) && state.right?.revokedAt).toEqual(at('2024-01-10'))
  })

  it('refuses an invitation without an inviter: one always has an inviter', () => {
    const state = replayInvitation([stored(sent, 1, at('2024-01-10'), null)])
    expect(Either.isLeft(state) && state.left).toBeInstanceOf(UnreadableEvent)
  })
})
