import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { StoredEvent, UnreadableEvent } from '../events/event-store'
import { Rejected } from './decision'
import {
  absorbSubject,
  addPosition,
  addSubject,
  deleteSubject,
  editPosition,
  editSubject,
  findPosition,
  followMergedSubject,
  judgePositions,
  judgeUnjudgedPositions,
  linkSubject,
  livePositions,
  mergePositions,
  mergeSubjectInto,
  POSITIONS_UNSETTLED,
  positionAfter,
  POSITION_GONE,
  POSITION_NOT_FOUND,
  SAME_POSITION,
  positionAdded,
  positionEdited,
  positionMergedInto,
  positionsJudged,
  replaySubject,
  sameNameOnTarget,
  setSubjectThemes,
  subjectAbsorbed,
  subjectAdded,
  subjectDeleted,
  subjectEdited,
  subjectLinked,
  subjectMergedInto,
  subjectThemesSet,
  subjectUnlinked,
  TARGET_POSITION_GONE,
  unlinkSubject,
  verdictOn,
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

describe('judging two positions', () => {
  const withBoth = rebuilt(added, pour, contre)

  it('names the pair the same way whichever position comes first', () => {
    expect(positionsJudged('pos-2', 'pos-1', true)).toEqual(positionsJudged('pos-1', 'pos-2', true))
  })

  it('records that two open positions go together, or against each other', () => {
    expect(judgePositions('pos-2', 'pos-1', true)(withBoth)).toEqual(
      Either.right([positionsJudged('pos-1', 'pos-2', true)]),
    )
    expect(judgePositions('pos-1', 'pos-2', false)(withBoth)).toEqual(
      Either.right([positionsJudged('pos-1', 'pos-2', false)]),
    )
  })

  it('writes nothing when the verdict already stands', () => {
    const judged = rebuilt(added, pour, contre, positionsJudged('pos-1', 'pos-2', true))
    expect(judgePositions('pos-2', 'pos-1', true)(judged)).toEqual(Either.right([]))
    expect(judgePositions('pos-2', 'pos-1', false)(judged)).toEqual(
      Either.right([positionsJudged('pos-1', 'pos-2', false)]),
    )
  })

  it('refuses a position judged against itself, or one the subject no longer has', () => {
    expect(judgePositions('pos-1', 'pos-1', true)(withBoth)).toEqual(
      Either.left(new Rejected(SAME_POSITION)),
    )
    expect(judgePositions('pos-1', 'pos-9', true)(withBoth)).toEqual(
      Either.left(new Rejected(POSITION_GONE)),
    )
  })

  it('reads no verdict on a pair nobody judged, and the last one on a pair judged twice', () => {
    expect(verdictOn(withBoth, 'pos-1', 'pos-2')).toBeUndefined()
    const judged = rebuilt(
      added,
      pour,
      contre,
      positionsJudged('pos-1', 'pos-2', true),
      positionsJudged('pos-2', 'pos-1', false),
    )
    expect(verdictOn(judged, 'pos-2', 'pos-1')).toBe(false)
    expect(judged.judgements).toHaveLength(1)
  })

  it('forgets the verdicts on a position merged away', () => {
    const merged = rebuilt(
      added,
      pour,
      contre,
      positionsJudged('pos-1', 'pos-2', true),
      positionMergedInto('pos-2', 'pos-1'),
    )
    expect(merged.judgements).toEqual([])
  })

  it('takes a first verdict on a pair nobody judged', () => {
    expect(judgeUnjudgedPositions('pos-2', 'pos-1', true)(withBoth)).toEqual(
      Either.right([positionsJudged('pos-1', 'pos-2', true)]),
    )
  })

  it('leaves a pair already judged as it stands, whatever the first verdict says', () => {
    const judged = rebuilt(added, pour, contre, positionsJudged('pos-1', 'pos-2', false))
    expect(judgeUnjudgedPositions('pos-1', 'pos-2', true)(judged)).toEqual(Either.right([]))
  })

  it('takes no first verdict on a position gone, or against itself: nothing is refused', () => {
    expect(judgeUnjudgedPositions('pos-1', 'pos-9', true)(withBoth)).toEqual(Either.right([]))
    expect(judgeUnjudgedPositions('pos-1', 'pos-1', true)(withBoth)).toEqual(Either.right([]))
  })
})

describe('merging a subject into another', () => {
  const absorbedId = '7c1f0a52-6f0e-4d0b-8a57-1d2e3f4a5b6c'
  const duplicate = {
    title: 'Le SMIC',
    presentation: 'Une autre présentation suffisamment longue.',
    problem: 'Le SMIC est-il trop bas ?',
  }
  const favorable = positionAdded({
    positionId: 'dup-1',
    title: 'Favorable à une hausse',
    description: 'Une description suffisamment longue.',
  })
  const gel = positionAdded({
    positionId: 'dup-2',
    title: 'Pour un gel',
    description: 'Une description suffisamment longue.',
  })

  /** The subject that disappears, in a stream of its own */
  const absorbed = (...events: Array<{ type: string; payload: unknown }>) => {
    const state = replaySubject(stream(...events).map((e) => ({ ...e, streamId: absorbedId })))
    if (Either.isLeft(state) || !state.right) throw new Error('expected a state')
    return state.right
  }

  const fates = [{ positionId: 'dup-1', into: 'pos-1' }, { positionId: 'dup-2' }]
  const carriedGel = {
    positionId: 'dup-2',
    title: 'Pour un gel',
    slug: 'pour-un-gel',
    description: 'Une description suffisamment longue.',
    // Whoever added it to the subject that disappears, and when: the third event of that stream
    createdBy: 'alice',
    createdAt: '2024-01-12T10:00:00.000Z',
  }
  const target = rebuilt(added, pour, contre)
  const source = absorbed(subjectAdded(duplicate), favorable, gel)

  it('the subject that disappears settles each of its open positions', () => {
    expect(mergeSubjectInto('target', fates)(source)).toEqual(
      Either.right([subjectMergedInto('target', fates)]),
    )
  })

  it('the subject that disappears refuses a position left without a fate, or one it does not have', () => {
    expect(mergeSubjectInto('target', [{ positionId: 'dup-2' }])(source)).toEqual(
      Either.left(new Rejected(POSITIONS_UNSETTLED)),
    )
    expect(mergeSubjectInto('target', [...fates, { positionId: 'pos-9' }])(source)).toEqual(
      Either.left(new Rejected(POSITIONS_UNSETTLED)),
    )
    expect(mergeSubjectInto('target', [...fates, { positionId: 'dup-2' }])(source)).toEqual(
      Either.left(new Rejected(POSITIONS_UNSETTLED)),
    )
  })

  it('the subject that remains takes the positions carried over, as they were named', () => {
    expect(absorbSubject(source, fates)(target)).toEqual(
      Either.right([subjectAbsorbed(absorbedId, [carriedGel])]),
    )
  })

  it('the subject that remains keeps the verdicts between the positions carried over, not those on a position folded', () => {
    const neutre = positionAdded({
      positionId: 'dup-3',
      title: 'Sans avis',
      description: 'Une description suffisamment longue.',
    })
    const judgedSource = absorbed(
      subjectAdded(duplicate),
      favorable,
      gel,
      neutre,
      positionsJudged('dup-2', 'dup-3', true),
      positionsJudged('dup-1', 'dup-2', true),
    )
    const decided = absorbSubject(judgedSource, [...fates, { positionId: 'dup-3' }])(target)
    expect(Either.isRight(decided) && decided.right.slice(1)).toEqual([
      positionsJudged('dup-2', 'dup-3', true),
    ])
  })

  it('the subject that remains refuses a fold into a position it no longer has', () => {
    const withoutPour = rebuilt(added, pour, contre, positionMergedInto('pos-1', 'pos-2'))
    expect(absorbSubject(source, fates)(withoutPour)).toEqual(
      Either.left(new Rejected(TARGET_POSITION_GONE)),
    )
  })

  it('the subject that remains refuses a position carried over under a name it already has, even on a position gone', () => {
    const twin = absorbed(
      subjectAdded(duplicate),
      positionAdded({ ...pourInput, positionId: 'dup-3' }),
    )
    const refusal = Either.left(new Rejected(sameNameOnTarget('Pour une hausse')))
    expect(absorbSubject(twin, [{ positionId: 'dup-3' }])(target)).toEqual(refusal)

    const pourGone = rebuilt(added, pour, contre, positionMergedInto('pos-1', 'pos-2'))
    expect(absorbSubject(twin, [{ positionId: 'dup-3' }])(pourGone)).toEqual(refusal)
  })

  it('the subject that remains gains the themes it lacked, never a second primary one', () => {
    const themed = rebuilt(added, subjectThemesSet([{ themeId: 'eco', isPrimary: true }]))
    const from = absorbed(
      subjectAdded(duplicate),
      subjectThemesSet([
        { themeId: 'soc', isPrimary: true },
        { themeId: 'eco', isPrimary: false },
      ]),
    )
    expect(absorbSubject(from, [])(themed)).toEqual(
      Either.right([
        subjectAbsorbed(absorbedId, []),
        subjectThemesSet([
          { themeId: 'eco', isPrimary: true },
          { themeId: 'soc', isPrimary: false },
        ]),
      ]),
    )
  })

  it('the subject that remains, when it had no theme, takes those of the other with their primary one', () => {
    const themes = [
      { themeId: 'soc', isPrimary: true },
      { themeId: 'eco', isPrimary: false },
    ]
    const from = absorbed(subjectAdded(duplicate), subjectThemesSet(themes))
    expect(absorbSubject(from, [])(rebuilt(added))).toEqual(
      Either.right([subjectAbsorbed(absorbedId, []), subjectThemesSet(themes)]),
    )
  })

  it('the subject that remains inherits the links it lacked, never one to itself', () => {
    const linked = rebuilt(added, subjectLinked('shared'), subjectLinked(absorbedId))
    const from = absorbed(
      subjectAdded(duplicate),
      subjectLinked('shared'),
      subjectLinked('retraites'),
      subjectLinked(streamId),
    )
    expect(absorbSubject(from, [])(linked)).toEqual(
      Either.right([subjectAbsorbed(absorbedId, []), subjectLinked('retraites')]),
    )
  })

  it('a subject linked to the one that disappears now links to the one that remains', () => {
    const linkedToSource = rebuilt(added, subjectLinked('source'))
    expect(followMergedSubject('source', 'target')(linkedToSource)).toEqual(
      Either.right([subjectUnlinked('source'), subjectLinked('target')]),
    )
    const linkedToBoth = rebuilt(added, subjectLinked('source'), subjectLinked('target'))
    expect(followMergedSubject('source', 'target')(linkedToBoth)).toEqual(
      Either.right([subjectUnlinked('source')]),
    )
  })

  it('tells where a statement stands after the merge', () => {
    const after = positionAfter(fates)
    expect([after('dup-1'), after('dup-2'), after('unknown')]).toEqual([
      'pos-1',
      'dup-2',
      'unknown',
    ])
  })

  it('replays the subject that disappears as gone, positions included', () => {
    const state = absorbed(
      subjectAdded(duplicate),
      favorable,
      gel,
      subjectMergedInto('target', fates),
    )
    expect(state.deletedAt).toEqual(at('2024-01-13'))
    expect(livePositions(state)).toEqual([])
  })

  it('replays the subject that remains with the positions it took, and without a link to what it absorbed', () => {
    const state = rebuilt(
      added,
      pour,
      subjectLinked(absorbedId),
      subjectAbsorbed(absorbedId, [carriedGel]),
    )
    expect(livePositions(state).map((p) => [p.id, p.slug, p.subjectId])).toEqual([
      ['pos-1', 'pour-une-hausse', streamId],
      ['dup-2', 'pour-un-gel', streamId],
    ])
    expect(state.relatedSubjectIds).toEqual([])
  })

  it('replays a position carried over as added by its author on its day, changed on the day of the merge', () => {
    const merge = stored(
      subjectAbsorbed(absorbedId, [carriedGel]),
      2,
      at('2024-03-01'),
      'the-one-who-merges',
    )
    const state = replaySubject([...stream(added), merge])
    const gelNow = Either.isRight(state) && state.right && findPosition(state.right, 'dup-2')

    expect(gelNow).toMatchObject({
      createdBy: 'alice',
      createdAt: at('2024-01-12'),
      updatedAt: at('2024-03-01'),
    })
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
