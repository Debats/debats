import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { StoredEvent, UnreadableEvent } from '../events/event-store'
import {
  addOccupation,
  addOccupationFamily,
  deleteOccupationFamily,
  removeOccupation,
  replayOccupationFamily,
} from './occupation-family'

const streamId = '1f2e3d4c-5b6a-4798-8a9b-0c1d2e3f4a5b'
const economistId = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'
const at = (day: string) => new Date(`${day}T10:00:00Z`)

const stored = (
  event: { type: string; payload: unknown },
  revision: number,
  occurredAt: Date,
  actorId: string | null = 'alice',
): StoredEvent => ({
  ...event,
  streamType: 'occupation_family',
  streamId,
  revision,
  actorId,
  metadata: {},
  occurredAt,
})

const added = addOccupationFamily({
  name: ' Chercheur·se et universitaire ',
  description: '',
  position: 3,
})
const economist = addOccupation(economistId, { name: ' Économiste ', description: 'Chercheur·se.' })

describe('occupation family decisions', () => {
  it('derive the slugs from the trimmed names', () => {
    expect(added.payload).toEqual({
      name: 'Chercheur·se et universitaire',
      slug: 'chercheur-se-et-universitaire',
      description: '',
      position: 3,
    })
    expect(economist.payload).toEqual({
      occupationId: economistId,
      name: 'Économiste',
      slug: 'economiste',
      description: 'Chercheur·se.',
    })
  })
})

describe('replayOccupationFamily', () => {
  it('rebuilds nothing from an empty stream', () => {
    expect(replayOccupationFamily([])).toEqual(Either.right(null))
  })

  it('rebuilds the family and its occupations, each with its actor and date', () => {
    const state = replayOccupationFamily([
      stored(added, 1, at('2024-01-10')),
      stored(economist, 2, at('2024-02-01'), 'bob'),
    ])
    expect(Either.isRight(state) && state.right).toEqual({
      family: {
        id: streamId,
        name: 'Chercheur·se et universitaire',
        slug: 'chercheur-se-et-universitaire',
        description: '',
        position: 3,
        createdBy: 'alice',
        updatedBy: 'alice',
        createdAt: at('2024-01-10'),
        updatedAt: at('2024-01-10'),
      },
      occupations: [
        {
          id: economistId,
          name: 'Économiste',
          slug: 'economiste',
          familyId: streamId,
          description: 'Chercheur·se.',
          createdBy: 'bob',
          updatedBy: 'bob',
          createdAt: at('2024-02-01'),
          updatedAt: at('2024-02-01'),
        },
      ],
      deletedAt: null,
    })
  })

  it('drops a removed occupation', () => {
    const state = replayOccupationFamily([
      stored(added, 1, at('2024-01-10')),
      stored(economist, 2, at('2024-02-01')),
      stored(removeOccupation(economistId), 3, at('2024-03-01')),
    ])
    expect(Either.isRight(state) && state.right?.occupations).toEqual([])
  })

  it('marks a deletion with its date', () => {
    const state = replayOccupationFamily([
      stored(added, 1, at('2024-01-10')),
      stored(deleteOccupationFamily(), 2, at('2024-03-01')),
    ])
    expect(Either.isRight(state) && state.right?.deletedAt).toEqual(at('2024-03-01'))
  })

  it('refuses a creation without an author', () => {
    const state = replayOccupationFamily([stored(added, 1, at('2024-01-10'), null)])
    expect(Either.isLeft(state) && state.left).toBeInstanceOf(UnreadableEvent)
    const occupation = replayOccupationFamily([
      stored(added, 1, at('2024-01-10')),
      stored(economist, 2, at('2024-02-01'), null),
    ])
    expect(Either.isLeft(occupation) && occupation.left.message).toContain('author')
  })

  it('refuses an event it cannot read', () => {
    const state = replayOccupationFamily([
      stored({ type: 'OccupationFamilyAdded', payload: {} }, 1, at('2024-01-10')),
    ])
    expect(Either.isLeft(state) && state.left).toBeInstanceOf(UnreadableEvent)
  })
})
