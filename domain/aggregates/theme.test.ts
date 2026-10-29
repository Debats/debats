import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { StoredEvent, UnreadableEvent } from '../events/event-store'
import { addTheme, deleteTheme, replayTheme, themeAdded, themeDeleted } from './theme'

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

const economy = { name: 'Économie', description: 'Fiscalité, emploi, finances publiques.' }
const added = themeAdded(economy)

describe('theme facts', () => {
  it('derive the slug from the name', () => {
    expect(added.payload).toEqual({
      name: 'Économie',
      slug: 'economie',
      description: 'Fiscalité, emploi, finances publiques.',
    })
  })
})

describe('theme decisions', () => {
  it('open the stream with the theme added', () => {
    expect(addTheme(economy)).toEqual([added])
  })

  it('record a deletion, which nothing in the state can refuse', () => {
    const state = replayTheme([stored(added, 1, at('2024-01-10'))])
    if (Either.isLeft(state) || !state.right) throw new Error('expected a state')
    expect(deleteTheme()(state.right)).toEqual(Either.right([themeDeleted()]))
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
      stored(themeDeleted(), 2, at('2024-01-11')),
    ])
    expect(Either.isRight(state) && state.right?.deletedAt).toEqual(at('2024-01-11'))
  })

  it('refuses an event it cannot read', () => {
    const state = replayTheme([
      stored({ type: 'ThemeAdded', payload: { name: 1 } }, 1, at('2024-01-10')),
    ])
    expect(Either.isLeft(state) && state.left).toBeInstanceOf(UnreadableEvent)
  })

  it('refuses a stream that does not open with a creation: the journal is corrupt', () => {
    const state = replayTheme([stored(themeDeleted(), 1, at('2024-01-10'))])
    expect(Either.isLeft(state) && state.left).toBeInstanceOf(UnreadableEvent)
    expect(Either.isLeft(state) && state.left?.message).toContain('not a creation')
  })

  it('refuses a creation without an author: a theme always has one', () => {
    const state = replayTheme([stored(added, 1, at('2024-01-10'), null)])
    expect(Either.isLeft(state) && state.left?.message).toContain('needs an author')
  })
})
