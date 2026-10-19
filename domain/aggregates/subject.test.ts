import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { StoredEvent, UnreadableEvent } from '../events/event-store'
import {
  addPosition,
  addSubject,
  deleteSubject,
  editPosition,
  editSubject,
  findPosition,
  linkSubject,
  livePositions,
  mergePosition,
  replaySubject,
  setSubjectThemes,
  unlinkSubject,
} from './subject'

const streamId = '0b4d1b9e-4f4a-4c1e-9f0a-3e2d1c0b9a88'
const at = (day: string) => new Date(`${day}T10:00:00Z`)

const stored = (
  event: { type: string; payload: unknown },
  revision: number,
  occurredAt: Date,
  actorId: string | null = 'alice',
): StoredEvent => ({
  ...event,
  streamType: 'subject',
  streamId,
  revision,
  actorId,
  metadata: {},
  occurredAt,
})

const added = addSubject({
  title: 'Le montant du SMIC',
  presentation: 'Une présentation suffisamment longue.',
  problem: 'Faut-il augmenter le SMIC ?',
})

const pour = addPosition({
  positionId: 'pos-1',
  title: 'Pour une hausse',
  description: 'Une description suffisamment longue.',
})

const contre = addPosition({
  positionId: 'pos-2',
  title: 'Contre une hausse',
  description: 'Une autre description suffisamment longue.',
})

const stream = (...events: Array<{ type: string; payload: unknown }>): StoredEvent[] =>
  events.map((event, index) => stored(event, index + 1, at(`2024-01-${10 + index}`)))

const rebuilt = (...events: Array<{ type: string; payload: unknown }>) => {
  const state = replaySubject(stream(...events))
  if (Either.isLeft(state) || !state.right) throw new Error('expected a state')
  return state.right
}

describe('subject decisions', () => {
  it('derive the slugs from the titles', () => {
    expect(added.payload).toMatchObject({ slug: 'le-montant-du-smic' })
    expect(pour.payload).toMatchObject({ slug: 'pour-une-hausse' })
  })
})

describe('replaySubject', () => {
  it('rebuilds nothing from an empty stream', () => {
    expect(replaySubject([])).toEqual(Either.right(null))
  })

  it('rebuilds the subject with the stream id, actor and date', () => {
    const state = rebuilt(added)
    expect(state.subject).toMatchObject({
      id: streamId,
      title: 'Le montant du SMIC',
      slug: 'le-montant-du-smic',
      createdBy: 'alice',
      createdAt: at('2024-01-10'),
    })
    expect(state.positions).toEqual([])
    expect(state.deletedAt).toBeNull()
  })

  it('applies an edit, keeping the creation', () => {
    const state = rebuilt(
      added,
      editSubject({
        title: 'Le SMIC',
        presentation: 'Présentation revue, assez longue.',
        problem: 'Faut-il augmenter le SMIC ?',
      }),
    )
    expect(state.subject).toMatchObject({
      title: 'Le SMIC',
      slug: 'le-smic',
      createdAt: at('2024-01-10'),
      updatedAt: at('2024-01-11'),
    })
  })

  it('carries the positions, each with its own actor and date', () => {
    const state = rebuilt(added, pour, contre)
    expect(livePositions(state).map((p) => [p.id, p.slug, p.subjectId])).toEqual([
      ['pos-1', 'pour-une-hausse', streamId],
      ['pos-2', 'contre-une-hausse', streamId],
    ])
    expect(findPosition(state, 'pos-2')?.createdAt).toEqual(at('2024-01-12'))
  })

  it('edits a position and merges another away', () => {
    const state = rebuilt(
      added,
      pour,
      contre,
      editPosition({
        positionId: 'pos-1',
        title: 'Pour',
        description: 'Description plus courte mais valide.',
      }),
      mergePosition('pos-2', 'pos-1'),
    )
    expect(livePositions(state).map((p) => [p.id, p.title, p.slug])).toEqual([
      ['pos-1', 'Pour', 'pour'],
    ])
    expect(state.positions[1].deletedAt).toEqual(at('2024-01-14'))
    expect(findPosition(state, 'pos-2')).toBeUndefined()
  })

  it('replaces the themes and keeps links without duplicates', () => {
    const state = rebuilt(
      added,
      setSubjectThemes([{ themeId: 'eco', isPrimary: true }]),
      setSubjectThemes([
        { themeId: 'soc', isPrimary: true },
        { themeId: 'eco', isPrimary: false },
      ]),
      linkSubject('other'),
      linkSubject('other'),
      linkSubject('third'),
      unlinkSubject('other'),
    )
    expect(state.themes).toEqual([
      { themeId: 'soc', isPrimary: true },
      { themeId: 'eco', isPrimary: false },
    ])
    expect(state.relatedSubjectIds).toEqual(['third'])
  })

  it('marks a deletion', () => {
    const state = rebuilt(added, deleteSubject())
    expect(state.deletedAt).toEqual(at('2024-01-11'))
  })

  it('refuses an event it cannot read', () => {
    const state = replaySubject(stream({ type: 'SubjectAdded', payload: { title: 1 } }))
    expect(Either.isLeft(state) && state.left).toBeInstanceOf(UnreadableEvent)
  })
})
