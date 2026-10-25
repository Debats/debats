import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { StoredEvent, UnreadableEvent } from '../events/event-store'
import { grantReputation, replayContributor } from './contributor'

const streamId = 'contributor-1'
const at = (day: string) => new Date(`${day}T10:00:00Z`)

const stored = (
  event: { type: string; payload: unknown },
  revision: number,
  occurredAt: Date,
): StoredEvent => ({
  ...event,
  streamType: 'contributor',
  streamId,
  revision,
  actorId: 'alice',
  metadata: {},
  occurredAt,
})

describe('grantReputation', () => {
  it('names the grant and leaves out what the deed does not say', () => {
    const grant = grantReputation({ grantId: 'grant-1', action: 'edited_subject', amount: 5 })
    expect(grant.payload).toEqual({ grantId: 'grant-1', action: 'edited_subject', amount: 5 })
  })
})

describe('replayContributor', () => {
  it('stands at zero without any grant', () => {
    expect(replayContributor([])).toEqual(Either.right({ reputation: 0, grants: [] }))
  })

  it('sums the grants and keeps each one dated', () => {
    const state = replayContributor([
      stored(
        grantReputation({
          grantId: 'grant-1',
          action: 'added_subject',
          amount: 50,
          relatedEntityType: 'subject',
          relatedEntityId: 'subject-1',
        }),
        1,
        at('2024-01-10'),
      ),
      stored(
        grantReputation({ grantId: 'grant-2', action: 'statement_rejected', amount: -100 }),
        2,
        at('2024-01-11'),
      ),
    ])
    expect(Either.isRight(state) && state.right).toMatchObject({
      reputation: -50,
      grants: [
        {
          contributorId: streamId,
          action: 'added_subject',
          amount: 50,
          relatedEntityType: 'subject',
          relatedEntityId: 'subject-1',
          createdAt: at('2024-01-10'),
        },
        { action: 'statement_rejected', amount: -100, createdAt: at('2024-01-11') },
      ],
    })
  })

  it('refuses an event it cannot read', () => {
    const state = replayContributor([
      stored({ type: 'ReputationGranted', payload: { amount: 'beaucoup' } }, 1, at('2024-01-10')),
    ])
    expect(Either.isLeft(state) && state.left).toBeInstanceOf(UnreadableEvent)
  })
})
