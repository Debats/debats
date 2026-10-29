import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { StoredEvent, UnreadableEvent } from '../events/event-store'
import { Rejected } from './decision'
import {
  addPosition,
  addSubject,
  deleteSubject,
  editPosition,
  editSubject,
  findPosition,
  linkSubject,
  livePositions,
  mergePositions,
  POSITION_GONE,
  POSITION_NOT_FOUND,
  positionAdded,
  positionEdited,
  positionMergedInto,
  replaySubject,
  setSubjectThemes,
  subjectAdded,
  subjectDeleted,
  subjectEdited,
  subjectLinked,
  subjectThemesSet,
  subjectUnlinked,
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

const smic = {
  title: 'Le montant du SMIC',
  presentation: 'Une présentation suffisamment longue.',
  problem: 'Faut-il augmenter le SMIC ?',
}

const added = subjectAdded(smic)

const pourInput = {
  positionId: 'pos-1',
  title: 'Pour une hausse',
  description: 'Une description suffisamment longue.',
}

const pour = positionAdded(pourInput)

const contre = positionAdded({
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

describe('subject facts', () => {
  it('derive the slugs from the titles', () => {
    expect(added.payload).toMatchObject({ slug: 'le-montant-du-smic' })
    expect(pour.payload).toMatchObject({ slug: 'pour-une-hausse' })
  })
})

describe('subject decisions', () => {
  const withBoth = rebuilt(added, pour, contre)

  it('open the stream with the subject added', () => {
    expect(addSubject(smic)).toEqual([added])
  })

  it('record what nothing in the state can refuse', () => {
    expect(editSubject(smic)(withBoth)).toEqual(Either.right([subjectEdited(smic)]))
    expect(addPosition(pourInput)(withBoth)).toEqual(Either.right([pour]))
    expect(setSubjectThemes([{ themeId: 'eco', isPrimary: true }])(withBoth)).toEqual(
      Either.right([subjectThemesSet([{ themeId: 'eco', isPrimary: true }])]),
    )
    expect(linkSubject('other')(withBoth)).toEqual(Either.right([subjectLinked('other')]))
    expect(unlinkSubject('other')(withBoth)).toEqual(Either.right([subjectUnlinked('other')]))
    expect(deleteSubject()(withBoth)).toEqual(Either.right([subjectDeleted()]))
  })

  it('edit a position the subject still has', () => {
    const edited = { positionId: 'pos-1', title: 'Pour', description: 'Description assez longue.' }
    expect(editPosition(edited)(withBoth)).toEqual(Either.right([positionEdited(edited)]))
  })

  it('refuse to edit a position the subject does not have', () => {
    const unknown = { positionId: 'pos-9', title: 'Pour', description: 'Description assez longue.' }
    expect(editPosition(unknown)(withBoth)).toEqual(Either.left(new Rejected(POSITION_NOT_FOUND)))
  })

  it('merge a position into another while both are open', () => {
    expect(mergePositions('pos-2', 'pos-1')(withBoth)).toEqual(
      Either.right([positionMergedInto('pos-2', 'pos-1')]),
    )
  })

  it('refuse a merge once one of the positions is gone', () => {
    const merged = rebuilt(added, pour, contre, positionMergedInto('pos-2', 'pos-1'))
    expect(mergePositions('pos-2', 'pos-1')(merged)).toEqual(
      Either.left(new Rejected(POSITION_GONE)),
    )
    expect(mergePositions('pos-1', 'pos-2')(merged)).toEqual(
      Either.left(new Rejected(POSITION_GONE)),
    )
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
      subjectEdited({
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
      positionEdited({
        positionId: 'pos-1',
        title: 'Pour',
        description: 'Description plus courte mais valide.',
      }),
      positionMergedInto('pos-2', 'pos-1'),
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
      subjectThemesSet([{ themeId: 'eco', isPrimary: true }]),
      subjectThemesSet([
        { themeId: 'soc', isPrimary: true },
        { themeId: 'eco', isPrimary: false },
      ]),
      subjectLinked('other'),
      subjectLinked('other'),
      subjectLinked('third'),
      subjectUnlinked('other'),
    )
    expect(state.themes).toEqual([
      { themeId: 'soc', isPrimary: true },
      { themeId: 'eco', isPrimary: false },
    ])
    expect(state.relatedSubjectIds).toEqual(['third'])
  })

  it('marks a deletion', () => {
    const state = rebuilt(added, subjectDeleted())
    expect(state.deletedAt).toEqual(at('2024-01-11'))
  })

  it('refuses an event it cannot read', () => {
    const state = replaySubject(stream({ type: 'SubjectAdded', payload: { title: 1 } }))
    expect(Either.isLeft(state) && state.left).toBeInstanceOf(UnreadableEvent)
  })
})
