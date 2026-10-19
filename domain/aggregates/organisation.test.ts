import { describe, it, expect } from 'vitest'
import { Either, Option } from 'effect'
import { StoredEvent, UnreadableEvent } from '../events/event-store'
import { addOrganisation, editOrganisation, replayOrganisation } from './organisation'

const streamId = '7b1d0e4f-3c2a-4f7b-9d8e-0f1a2b3c4d5e'
const at = (day: string) => new Date(`${day}T10:00:00Z`)

const stored = (
  event: { type: string; payload: unknown },
  revision: number,
  occurredAt: Date,
  actorId: string | null = 'alice',
): StoredEvent => ({
  ...event,
  streamType: 'organisation',
  streamId,
  revision,
  actorId,
  metadata: {},
  occurredAt,
})

const added = addOrganisation({
  name: 'Confédération générale du travail',
  acronym: 'CGT',
  organisationType: 'union',
  presentation: 'Confédération syndicale française fondée en 1895.',
  wikipediaUrl: 'https://fr.wikipedia.org/wiki/CGT',
  notorietySources: [],
})

const stream = (...events: Array<{ type: string; payload: unknown }>): StoredEvent[] =>
  events.map((event, index) => stored(event, index + 1, at(`2024-01-${10 + index}`)))

const rebuilt = (...events: Array<{ type: string; payload: unknown }>) => {
  const state = replayOrganisation(stream(...events))
  if (Either.isLeft(state) || !state.right) throw new Error('expected a state')
  return state.right
}

describe('organisation decisions', () => {
  it('derive the slug from the name and leave out blanks', () => {
    expect(added.payload).toMatchObject({ slug: 'confederation-generale-du-travail' })
    expect(added.payload).not.toHaveProperty('websiteUrl')
    expect(
      editOrganisation({
        name: 'Attac',
        acronym: '  ',
        organisationType: 'ngo',
        presentation: 'Association altermondialiste.',
        notorietySources: [],
      }).payload,
    ).not.toHaveProperty('acronym')
  })
})

describe('replayOrganisation', () => {
  it('rebuilds nothing from an empty stream', () => {
    expect(replayOrganisation([])).toEqual(Either.right(null))
  })

  it('rebuilds the organisation with the stream id, actor and date', () => {
    const state = rebuilt(added)
    expect(state.organisation).toMatchObject({
      id: streamId,
      name: 'Confédération générale du travail',
      slug: 'confederation-generale-du-travail',
      acronym: Option.some('CGT'),
      organisationType: 'union',
      wikipediaUrl: Option.some('https://fr.wikipedia.org/wiki/CGT'),
      websiteUrl: Option.none(),
      createdBy: 'alice',
      updatedBy: 'alice',
      createdAt: at('2024-01-10'),
    })
    expect(state.deletedAt).toBeNull()
  })

  it('applies an edit, keeping the creation', () => {
    const edit = editOrganisation({
      name: 'CGT',
      organisationType: 'union',
      presentation: 'Une présentation revue, assez longue.',
      websiteUrl: 'https://www.cgt.fr',
      notorietySources: ['https://a.example', 'https://b.example'],
    })
    const state = replayOrganisation([
      stored(added, 1, at('2024-01-10')),
      stored(edit, 2, at('2024-01-11'), 'bob'),
    ])
    expect(Either.isRight(state) && state.right?.organisation).toMatchObject({
      name: 'CGT',
      slug: 'cgt',
      acronym: Option.none(),
      wikipediaUrl: Option.none(),
      websiteUrl: Option.some('https://www.cgt.fr'),
      notorietySources: ['https://a.example', 'https://b.example'],
      createdBy: 'alice',
      updatedBy: 'bob',
      createdAt: at('2024-01-10'),
      updatedAt: at('2024-01-11'),
    })
  })

  it('marks a deletion with its date', () => {
    const state = rebuilt(added, { type: 'OrganisationDeleted', payload: {} })
    expect(state.deletedAt).toEqual(at('2024-01-11'))
  })

  it('refuses an event it cannot read', () => {
    const state = replayOrganisation(
      stream({
        type: 'OrganisationAdded',
        payload: { ...added.payload, organisationType: 'cult' },
      }),
    )
    expect(Either.isLeft(state) && state.left).toBeInstanceOf(UnreadableEvent)
  })

  it('refuses a creation without an author: an organisation always has one', () => {
    const state = replayOrganisation([stored(added, 1, at('2024-01-10'), null)])
    expect(Either.isLeft(state) && state.left?.message).toContain('needs an author')
  })
})
