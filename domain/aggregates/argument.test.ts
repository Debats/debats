import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { StoredEvent, UnreadableEvent } from '../events/event-store'
import {
  absorbArgument,
  addArgument,
  mergeArgumentInto,
  renameArgument,
  replayArgument,
} from './argument'

const streamId = '9c2e1f5a-4d3b-4a8c-be9f-1a2b3c4d5e6f'
const at = (day: string) => new Date(`${day}T10:00:00Z`)

const stored = (
  event: { type: string; payload: unknown },
  revision: number,
  occurredAt: Date,
  actorId: string | null = 'alice',
): StoredEvent => ({
  ...event,
  streamType: 'argument',
  streamId,
  revision,
  actorId,
  metadata: {},
  occurredAt,
})

const added = addArgument({ title: '  Coût budgétaire ', description: ' Pèse sur le budget. ' })

const stream = (...events: Array<{ type: string; payload: unknown }>): StoredEvent[] =>
  events.map((event, index) => stored(event, index + 1, at(`2024-01-${10 + index}`)))

const rebuilt = (...events: Array<{ type: string; payload: unknown }>) => {
  const state = replayArgument(stream(...events))
  if (Either.isLeft(state) || !state.right) throw new Error('expected a state')
  return state.right
}

describe('argument decisions', () => {
  it('trim the wording and derive the slug from the title', () => {
    expect(added.payload).toEqual({
      title: 'Coût budgétaire',
      slug: 'cout-budgetaire',
      description: 'Pèse sur le budget.',
    })
  })
})

describe('replayArgument', () => {
  it('rebuilds nothing from an empty stream', () => {
    expect(replayArgument([])).toEqual(Either.right(null))
  })

  it('rebuilds the argument with the stream id, actor and date', () => {
    const state = rebuilt(added)
    expect(state).toEqual({
      argument: {
        id: streamId,
        title: 'Coût budgétaire',
        slug: 'cout-budgetaire',
        description: 'Pèse sur le budget.',
        createdBy: 'alice',
        updatedBy: 'alice',
        createdAt: at('2024-01-10'),
        updatedAt: at('2024-01-10'),
      },
      mergedInto: null,
      absorbedIds: [],
      deletedAt: null,
    })
  })

  it('applies a renaming, moving the slug and keeping the creation', () => {
    const state = replayArgument([
      stored(added, 1, at('2024-01-10')),
      stored(
        renameArgument({ title: 'Coût pour les finances publiques', description: '' }),
        2,
        at('2024-01-11'),
        'bob',
      ),
    ])
    expect(Either.isRight(state) && state.right?.argument).toMatchObject({
      title: 'Coût pour les finances publiques',
      slug: 'cout-pour-les-finances-publiques',
      description: '',
      createdBy: 'alice',
      updatedBy: 'bob',
      updatedAt: at('2024-01-11'),
    })
  })

  it('remembers into which argument it was merged, and is gone since then', () => {
    const state = rebuilt(added, mergeArgumentInto('target-id'))
    expect(state.mergedInto).toBe('target-id')
    expect(state.deletedAt).toEqual(at('2024-01-11'))
  })

  it('remembers the duplicates it absorbed, and stays', () => {
    const state = rebuilt(added, absorbArgument('dup-1'), absorbArgument('dup-2'))
    expect(state.absorbedIds).toEqual(['dup-1', 'dup-2'])
    expect(state.deletedAt).toBeNull()
  })

  it('marks a deletion with its date', () => {
    const state = rebuilt(added, { type: 'ArgumentDeleted', payload: {} })
    expect(state.deletedAt).toEqual(at('2024-01-11'))
    expect(state.mergedInto).toBeNull()
  })

  it('refuses an event it cannot read', () => {
    const state = replayArgument(stream({ type: 'ArgumentAdded', payload: { title: 1 } }))
    expect(Either.isLeft(state) && state.left).toBeInstanceOf(UnreadableEvent)
  })

  it('refuses a creation without an author: an argument always has one', () => {
    const state = replayArgument([stored(added, 1, at('2024-01-10'), null)])
    expect(Either.isLeft(state) && state.left?.message).toContain('needs an author')
  })
})
