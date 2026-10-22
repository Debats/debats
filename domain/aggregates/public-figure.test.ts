import { describe, it, expect } from 'vitest'
import { Either, Option } from 'effect'
import { StoredEvent, UnreadableEvent } from '../events/event-store'
import {
  addMembership,
  addPublicFigure,
  editPublicFigure,
  findMembership,
  hasCurrentMembership,
  removeMembership,
  replayPublicFigure,
  setOccupations,
} from './public-figure'

const streamId = '5a0c9d3e-2b1f-4e6a-8c7d-9e0f1a2b3c4d'
const at = (day: string) => new Date(`${day}T10:00:00Z`)

const stored = (
  event: { type: string; payload: unknown },
  revision: number,
  occurredAt: Date,
  actorId: string | null = 'alice',
): StoredEvent => ({
  ...event,
  streamType: 'public_figure',
  streamId,
  revision,
  actorId,
  metadata: {},
  occurredAt,
})

const added = addPublicFigure({
  name: 'Jean Dupont',
  presentation: 'Un personnage public suffisamment connu.',
  wikipediaUrl: 'https://fr.wikipedia.org/wiki/Jean_Dupont',
  notorietySources: [],
})

const stream = (...events: Array<{ type: string; payload: unknown }>): StoredEvent[] =>
  events.map((event, index) => stored(event, index + 1, at(`2024-01-${10 + index}`)))

const rebuilt = (...events: Array<{ type: string; payload: unknown }>) => {
  const state = replayPublicFigure(stream(...events))
  if (Either.isLeft(state) || !state.right) throw new Error('expected a state')
  return state.right
}

describe('public figure decisions', () => {
  it('derive the slug from the name and leave out empty links', () => {
    expect(added.payload).toMatchObject({ slug: 'jean-dupont' })
    expect(added.payload).not.toHaveProperty('websiteUrl')
    expect(addMembership({ membershipId: 'm-1', organisationId: 'org-1' }).payload).toEqual({
      membershipId: 'm-1',
      organisationId: 'org-1',
    })
  })
})

describe('replayPublicFigure', () => {
  it('rebuilds nothing from an empty stream', () => {
    expect(replayPublicFigure([])).toEqual(Either.right(null))
  })

  it('rebuilds the figure with the stream id, actor and date', () => {
    const state = rebuilt(added)
    expect(state.figure).toMatchObject({
      id: streamId,
      name: 'Jean Dupont',
      slug: 'jean-dupont',
      wikipediaUrl: Option.some('https://fr.wikipedia.org/wiki/Jean_Dupont'),
      websiteUrl: Option.none(),
      createdBy: 'alice',
      createdAt: at('2024-01-10'),
    })
  })

  it('applies an edit, keeping the creation', () => {
    const state = rebuilt(
      added,
      editPublicFigure({
        name: 'Jean Dupond',
        presentation: 'Une présentation revue, assez longue.',
        websiteUrl: 'https://dupond.fr',
        notorietySources: ['https://a.example', 'https://b.example'],
      }),
    )
    expect(state.figure).toMatchObject({
      name: 'Jean Dupond',
      slug: 'jean-dupond',
      wikipediaUrl: Option.none(),
      websiteUrl: Option.some('https://dupond.fr'),
      notorietySources: ['https://a.example', 'https://b.example'],
      createdAt: at('2024-01-10'),
      updatedAt: at('2024-01-11'),
    })
  })

  it('replaces the occupations', () => {
    const state = rebuilt(
      added,
      setOccupations([{ occupationId: 'depute', current: true }]),
      setOccupations([
        { occupationId: 'depute', current: false },
        { occupationId: 'maire', current: true },
      ]),
    )
    expect(state.occupations).toEqual([
      { occupationId: 'depute', current: false },
      { occupationId: 'maire', current: true },
    ])
  })

  it('carries the memberships with their dates, actor and period', () => {
    const state = rebuilt(
      added,
      addMembership({
        membershipId: 'm-1',
        organisationId: 'org-1',
        role: 'Porte-parole',
        startedOn: at('2020-05-01'),
        endedOn: at('2022-05-01'),
      }),
      addMembership({ membershipId: 'm-2', organisationId: 'org-2' }),
    )
    expect(findMembership(state, 'm-1')).toMatchObject({
      publicFigureId: streamId,
      organisationId: 'org-1',
      role: Option.some('Porte-parole'),
      startedOn: Option.some(new Date('2020-05-01')),
      endedOn: Option.some(new Date('2022-05-01')),
      createdBy: 'alice',
      createdAt: at('2024-01-11'),
    })
    expect(hasCurrentMembership(state, 'org-1')).toBe(false)
    expect(hasCurrentMembership(state, 'org-2')).toBe(true)
  })

  it('forgets a removed membership', () => {
    const state = rebuilt(
      added,
      addMembership({ membershipId: 'm-1', organisationId: 'org-1' }),
      removeMembership('m-1'),
    )
    expect(state.memberships).toEqual([])
  })

  it('refuses an event it cannot read', () => {
    const state = replayPublicFigure(stream({ type: 'PublicFigureAdded', payload: { name: 1 } }))
    expect(Either.isLeft(state) && state.left).toBeInstanceOf(UnreadableEvent)
  })

  it('refuses a creation without an author: a figure always has one', () => {
    const state = replayPublicFigure([stored(added, 1, at('2024-01-10'), null)])
    expect(Either.isLeft(state) && state.left?.message).toContain('needs an author')
  })

  it('refuses an affiliation without an author, as the table does', () => {
    const affiliated = addMembership({ membershipId: 'm-1', organisationId: 'org-1' })
    const state = replayPublicFigure([
      stored(added, 1, at('2024-01-10')),
      stored(affiliated, 2, at('2024-01-11'), null),
    ])
    expect(Either.isLeft(state) && state.left?.message).toContain('needs an author')
  })
})
