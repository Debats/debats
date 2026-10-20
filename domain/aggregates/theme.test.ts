import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { StoredEvent, UnreadableEvent } from '../events/event-store'
import { addTheme, deleteTheme, replayTheme } from './theme'

const streamId = '1f2e3d4c-5b6a-4798-8a9b-0c1d2e3f4a5b'
const at = (day: string) => new Date(`${day}T10:00:00Z`)

const stored = (
  event: { type: string; payload: unknown },
  revision: number,
  occurredAt: Date,
  actorId: string | null = 'alice',
): StoredEvent => ({
  ...event,
  streamType: 'theme',
  streamId,
  revision,
  actorId,
  metadata: {},
  occurredAt,
})

const added = addTheme({ name: 'Économie', description: 'Fiscalité, emploi, finances publiques.' })

describe('theme decisions', () => {
  it('derive the slug from the name', () => {
    expect(added.payload).toEqual({
      name: 'Économie',
      slug: 'economie',
      description: 'Fiscalité, emploi, finances publiques.',
    })
  })
})

describe('replayTheme', () => {
  it('rebuilds nothing from an empty stream', () => {
    expect(replayTheme([])).toEqual(Either.right(null))
  })

  it('rebuilds the theme with the stream id, actor and date', () => {
    const state = replayTheme([stored(added, 1, at('2024-01-10'))])
    expect(Either.isRight(state) && state.right).toEqual({
      theme: {
        id: streamId,
        name: 'Économie',
        slug: 'economie',
        description: 'Fiscalité, emploi, finances publiques.',
        createdBy: 'alice',
        updatedBy: 'alice',
        createdAt: at('2024-01-10'),
        updatedAt: at('2024-01-10'),
      },
      deletedAt: null,
    })
  })

  it('marks a deletion with its date', () => {
    const state = replayTheme([
      stored(added, 1, at('2024-01-10')),
      stored(deleteTheme(), 2, at('2024-01-11')),
    ])
    expect(Either.isRight(state) && state.right?.deletedAt).toEqual(at('2024-01-11'))
  })

  it('refuses an event it cannot read', () => {
    const state = replayTheme([
      stored({ type: 'ThemeAdded', payload: { name: 1 } }, 1, at('2024-01-10')),
    ])
    expect(Either.isLeft(state) && state.left).toBeInstanceOf(UnreadableEvent)
  })

  it('refuses a creation without an author: a theme always has one', () => {
    const state = replayTheme([stored(added, 1, at('2024-01-10'), null)])
    expect(Either.isLeft(state) && state.left?.message).toContain('needs an author')
  })
})
