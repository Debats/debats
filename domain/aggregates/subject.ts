import { Either } from 'effect'
import {
  generateSlug as generatePositionSlug,
  Position,
  PositionId,
  PositionSlug,
  PositionTitle,
} from '../entities/position'
import {
  generateSlug as generateSubjectSlug,
  Subject,
  SubjectId,
  SubjectSlug,
  SubjectTitle,
} from '../entities/subject'
import { StoredEvent, StreamRef } from '../events/event-store'
import { orderedPair } from '../value-objects/pair'
import { always, Decision, refused } from './decision'
import { Decoded, replayStream } from './replay'
import {
  CarriedPosition,
  decodeSubjectEvent,
  PositionContent,
  PositionFate,
  SubjectContent,
  SubjectEvent,
  ThemeAssignmentPayload,
} from './subject-events'

export const SUBJECT_STREAM = 'subject'

export const subjectStream = (id: string): StreamRef => ({
  streamType: SUBJECT_STREAM,
  streamId: id,
})

export interface PositionState {
  position: Position
  deletedAt: Date | null
}

/** Two positions judged against each other, the smaller id first */
export interface PositionJudgement {
  positionIds: readonly [string, string]
  compatible: boolean
}

/** What the journal says a subject is right now, positions included */
export interface SubjectState {
  subject: Subject
  positions: readonly PositionState[]
  /** The pairs somebody judged; any other pair reads as contradictory */
  judgements: readonly PositionJudgement[]
  themes: readonly ThemeAssignmentPayload[]
  relatedSubjectIds: readonly string[]
  deletedAt: Date | null
}

/** The positions still open on the subject */
export const livePositions = (state: SubjectState): Position[] =>
  state.positions.filter((p) => p.deletedAt === null).map((p) => p.position)

export const findPosition = (state: SubjectState, positionId: string): Position | undefined =>
  livePositions(state).find((p) => p.id === positionId)

const isPair = (judgement: PositionJudgement, a: string, b: string) => {
  const [first, second] = orderedPair(a, b)
  return judgement.positionIds[0] === first && judgement.positionIds[1] === second
}

/** Whether the two positions were judged compatible; undefined while nobody judged them */
export const verdictOn = (state: SubjectState, a: string, b: string): boolean | undefined =>
  state.judgements.find((judgement) => isPair(judgement, a, b))?.compatible

export interface SubjectInput {
  title: string
  presentation: string
  problem: string
}

export interface PositionInput {
  positionId: string
  title: string
  description: string
}

/* Facts: what the stream records, named in the past tense as the events they are */

export const subjectAdded = (input: SubjectInput): SubjectEvent => ({
  type: 'SubjectAdded',
  payload: { ...input, slug: generateSubjectSlug(input.title) },
})

export const subjectEdited = (input: SubjectInput): SubjectEvent => ({
  type: 'SubjectEdited',
  payload: { ...input, slug: generateSubjectSlug(input.title) },
})

export const subjectThemesSet = (themes: readonly ThemeAssignmentPayload[]): SubjectEvent => ({
  type: 'SubjectThemesSet',
  payload: { themes: [...themes] },
})

export const subjectLinked = (subjectId: string): SubjectEvent => ({
  type: 'SubjectLinked',
  payload: { subjectId },
})

export const subjectUnlinked = (subjectId: string): SubjectEvent => ({
  type: 'SubjectUnlinked',
  payload: { subjectId },
})

export const positionAdded = (input: PositionInput): SubjectEvent => ({
  type: 'PositionAdded',
  payload: { ...input, slug: generatePositionSlug(input.title) },
})

export const positionEdited = (input: PositionInput): SubjectEvent => ({
  type: 'PositionEdited',
  payload: { ...input, slug: generatePositionSlug(input.title) },
})

export const positionMergedInto = (sourceId: string, targetId: string): SubjectEvent => ({
  type: 'PositionMergedInto',
  payload: { sourceId, targetId },
})

export const positionsJudged = (a: string, b: string, compatible: boolean): SubjectEvent => ({
  type: 'PositionsJudged',
  payload: { positionIds: orderedPair(a, b), compatible },
})

export const subjectDeleted = (): SubjectEvent => ({ type: 'SubjectDeleted', payload: {} })

export const subjectMergedInto = (
  targetId: string,
  fates: readonly PositionFate[],
): SubjectEvent => ({
  type: 'SubjectMergedInto',
  payload: { targetId, positions: [...fates] },
})

export const subjectAbsorbed = (
  subjectId: string,
  positions: readonly CarriedPosition[],
): SubjectEvent => ({
  type: 'SubjectAbsorbed',
  payload: { subjectId, positions: [...positions] },
})

/* Decisions: what a command asks of the subject, decided from its state */

export type SubjectDecision = Decision<SubjectState, SubjectEvent>

export const POSITION_NOT_FOUND = 'Position introuvable.'
export const POSITION_GONE = 'Une des deux positions n’existe plus.'

/** A contributor adds a subject; its id is the stream's, chosen by the command */
export const addSubject = (input: SubjectInput): SubjectEvent[] => [subjectAdded(input)]

export const editSubject = (input: SubjectInput): SubjectDecision => always(subjectEdited(input))

export const setSubjectThemes = (themes: readonly ThemeAssignmentPayload[]): SubjectDecision =>
  always(subjectThemesSet(themes))

/** Links are symmetric: the other subject records the same link in its own stream */
export const linkSubject = (subjectId: string): SubjectDecision => always(subjectLinked(subjectId))

export const unlinkSubject = (subjectId: string): SubjectDecision =>
  always(subjectUnlinked(subjectId))

/** The positions go with their subject; the statements record their own deletion */
export const deleteSubject = (): SubjectDecision => always(subjectDeleted())

/** A contributor adds a position; its id is chosen by the command, inside the subject's stream */
export const addPosition = (input: PositionInput): SubjectDecision => always(positionAdded(input))

/** The position must still be open on the subject */
export const editPosition =
  (input: PositionInput): SubjectDecision =>
  (state) =>
    findPosition(state, input.positionId)
      ? Either.right([positionEdited(input)])
      : refused(POSITION_NOT_FOUND)

/**
 * What was judged of the source holds for the target it becomes, wherever
 * nobody judged the target itself: whoever held the source with another
 * position still holds the two after the merge. The verdict between the
 * source and the target has nothing left to say.
 */
const judgementsFollowing = (
  state: SubjectState,
  sourceId: string,
  targetId: string,
): SubjectEvent[] =>
  state.judgements.flatMap(({ positionIds, compatible }) => {
    if (!positionIds.includes(sourceId)) return []
    const other = positionIds.find((id) => id !== sourceId)!
    const settled = other === targetId || verdictOn(state, targetId, other) !== undefined
    return settled ? [] : [positionsJudged(targetId, other, compatible)]
  })

/**
 * Both positions must still be open on the subject; the source disappears
 * into the target, which takes over the verdicts on it.
 */
export const mergePositions =
  (sourceId: string, targetId: string): SubjectDecision =>
  (state) =>
    findPosition(state, sourceId) && findPosition(state, targetId)
      ? Either.right([
          positionMergedInto(sourceId, targetId),
          ...judgementsFollowing(state, sourceId, targetId),
        ])
      : refused(POSITION_GONE)

export const SAME_POSITION = 'Une position ne se compare pas à elle-même.'

/**
 * Both positions must still be open on the subject. The verdict holds for
 * everyone who takes the two; one that already stands writes nothing.
 */
export const judgePositions =
  (a: string, b: string, compatible: boolean): SubjectDecision =>
  (state) => {
    if (a === b) return refused(SAME_POSITION)
    if (!findPosition(state, a) || !findPosition(state, b)) return refused(POSITION_GONE)
    return Either.right(
      verdictOn(state, a, b) === compatible ? [] : [positionsJudged(a, b, compatible)],
    )
  }

/**
 * The verdict of whoever records that an author took the two positions: it
 * counts only on a pair nobody judged, and never overturns one. It comes with
 * a statement, which it must not hold back: a position gone meanwhile writes
 * nothing instead of refusing.
 */
export const judgeUnjudgedPositions =
  (a: string, b: string, compatible: boolean): SubjectDecision =>
  (state) =>
    Either.right(
      a !== b &&
        findPosition(state, a) &&
        findPosition(state, b) &&
        verdictOn(state, a, b) === undefined
        ? [positionsJudged(a, b, compatible)]
        : [],
    )

export const POSITIONS_UNSETTLED =
  'Chaque position du sujet à fusionner doit être reportée ou fondue dans une autre, une seule fois.'
export const TARGET_POSITION_GONE = 'Une des positions du sujet conservé n’existe plus.'
export const sameNameOnTarget = (title: string) =>
  `La position « ${title} » porte le nom d’une position du sujet conservé : fondez-la dans celle-ci, ou renommez-la d’abord.`

/** Where a statement stands once its subject is merged: on the position its own was folded into, or on its own */
export const positionAfter =
  (fates: readonly PositionFate[]) =>
  (positionId: string): string =>
    fates.find((fate) => fate.positionId === positionId)?.into ?? positionId

/** The subject disappears into another, once each of its open positions has one fate */
export const mergeSubjectInto =
  (targetId: string, fates: readonly PositionFate[]): SubjectDecision =>
  (state) => {
    const settled = fates.map((fate) => fate.positionId).sort()
    const open = livePositions(state)
      .map((p) => p.id)
      .sort()
    return settled.length === open.length && settled.every((id, index) => id === open[index])
      ? Either.right([subjectMergedInto(targetId, fates)])
      : refused(POSITIONS_UNSETTLED)
  }

/**
 * The subject that remains takes another in, as that one stood before the
 * merge: the positions carried over become its own, and it gains the themes
 * and the links it lacked. Its own title, presentation and problem stay.
 */
export const absorbSubject =
  (absorbed: SubjectState, fates: readonly PositionFate[]): SubjectDecision =>
  (state) => {
    const carried = carriedOver(absorbed, fates)
    const refusal = foldIntoPositionGone(state, fates) ?? nameAlreadyTaken(state, carried)
    return refusal
      ? refused(refusal)
      : Either.right([
          subjectAbsorbed(absorbed.subject.id, carried.map(asCarried)),
          ...judgementsCarried(absorbed, carried),
          ...themesGained(state, absorbed),
          ...linksInherited(state, absorbed),
        ])
  }

/** The open positions of the subject that disappears that no fate folds into another */
const carriedOver = (absorbed: SubjectState, fates: readonly PositionFate[]): Position[] =>
  livePositions(absorbed).filter((p) =>
    fates.some((fate) => fate.positionId === p.id && !fate.into),
  )

/** The refusal of a fold into a position the subject that remains no longer has, if any */
const foldIntoPositionGone = (state: SubjectState, fates: readonly PositionFate[]) =>
  fates.every((fate) => !fate.into || findPosition(state, fate.into))
    ? undefined
    : TARGET_POSITION_GONE

/**
 * The refusal of a position carried over under a name the subject that
 * remains already has, if any: a slug is unique on its subject for good,
 * positions gone included.
 */
function nameAlreadyTaken(state: SubjectState, carried: readonly Position[]) {
  const twin = carried.find((p) => state.positions.some((own) => own.position.slug === p.slug))
  return twin && sameNameOnTarget(twin.title)
}

/** The verdicts between two positions carried over follow them; one on a position folded is lost */
const judgementsCarried = (absorbed: SubjectState, carried: readonly Position[]): SubjectEvent[] =>
  absorbed.judgements
    .filter(({ positionIds }) => positionIds.every((id) => carried.some((p) => p.id === id)))
    .map(({ positionIds: [a, b], compatible }) => positionsJudged(a, b, compatible))

const asCarried = (position: Position): CarriedPosition => ({
  positionId: position.id,
  title: position.title,
  slug: position.slug,
  description: position.description,
  createdBy: position.createdBy,
  createdAt: position.createdAt.toISOString(),
})

/**
 * The primary theme of the subject that remains stays the only one. A subject
 * that had no theme has no primary one to keep: it takes the other's as they
 * are, since themes never go without a primary one.
 */
function themesGained(state: SubjectState, absorbed: SubjectState): SubjectEvent[] {
  const hasPrimary = state.themes.some((own) => own.isPrimary)
  const gained = absorbed.themes
    .filter((theme) => !state.themes.some((own) => own.themeId === theme.themeId))
    .map(({ themeId, isPrimary }) => ({ themeId, isPrimary: isPrimary && !hasPrimary }))
  return gained.length > 0 ? [subjectThemesSet([...state.themes, ...gained])] : []
}

function linksInherited(state: SubjectState, absorbed: SubjectState): SubjectEvent[] {
  return absorbed.relatedSubjectIds
    .filter((id) => id !== state.subject.id && !state.relatedSubjectIds.includes(id))
    .map(subjectLinked)
}

/** A subject linked to one merged into another: its link follows, unless it already had it */
export const followMergedSubject =
  (sourceId: string, targetId: string): SubjectDecision =>
  (state) =>
    Either.right([
      subjectUnlinked(sourceId),
      ...(state.relatedSubjectIds.includes(targetId) ? [] : [subjectLinked(targetId)]),
    ])

/** Rebuilds the subject from its stream; null for a stream without events */
export const replaySubject = replayStream(decodeSubjectEvent, apply)

function apply(
  state: SubjectState | null,
  { event, stored }: Decoded<SubjectEvent>,
): SubjectState | null {
  switch (event.type) {
    case 'SubjectAdded':
      return {
        subject: subjectFrom(stored, event.payload),
        positions: [],
        judgements: [],
        themes: [],
        relatedSubjectIds: [],
        deletedAt: null,
      }
  }
  if (!state) return null
  switch (event.type) {
    case 'SubjectDeleted':
    case 'SubjectMergedInto':
      // The positions go with their subject: gone, folded, or now another subject's
      return {
        ...state,
        deletedAt: stored.occurredAt,
        positions: state.positions.map((p) =>
          p.deletedAt ? p : { ...p, deletedAt: stored.occurredAt },
        ),
      }
    case 'SubjectAbsorbed':
      return {
        ...state,
        positions: [
          ...state.positions,
          ...event.payload.positions.map((carried) => ({
            position: carriedPositionFrom(stored, state.subject.id, carried),
            deletedAt: null,
          })),
        ],
        relatedSubjectIds: state.relatedSubjectIds.filter((id) => id !== event.payload.subjectId),
      }
    case 'SubjectEdited':
      return {
        ...state,
        subject: {
          ...state.subject,
          title: SubjectTitle.make(event.payload.title),
          slug: SubjectSlug.make(event.payload.slug),
          presentation: event.payload.presentation,
          problem: event.payload.problem,
          updatedAt: stored.occurredAt,
        },
      }
    case 'SubjectThemesSet':
      return { ...state, themes: event.payload.themes }
    case 'SubjectLinked':
      return {
        ...state,
        relatedSubjectIds: state.relatedSubjectIds.includes(event.payload.subjectId)
          ? state.relatedSubjectIds
          : [...state.relatedSubjectIds, event.payload.subjectId],
      }
    case 'SubjectUnlinked':
      return {
        ...state,
        relatedSubjectIds: state.relatedSubjectIds.filter((id) => id !== event.payload.subjectId),
      }
    case 'PositionAdded':
      return {
        ...state,
        positions: [
          ...state.positions,
          { position: positionFrom(stored, state.subject.id, event.payload), deletedAt: null },
        ],
      }
    case 'PositionEdited':
      return mapPosition(state, event.payload.positionId, (p) => ({
        ...p,
        position: {
          ...p.position,
          title: PositionTitle.make(event.payload.title),
          slug: PositionSlug.make(event.payload.slug),
          description: event.payload.description,
          updatedAt: stored.occurredAt,
        },
      }))
    case 'PositionMergedInto':
      return positionGone(state, event.payload.sourceId, stored.occurredAt)
    case 'PositionRemoved':
      return positionGone(state, event.payload.positionId, stored.occurredAt)
    case 'PositionsJudged': {
      const [a, b] = event.payload.positionIds
      return {
        ...state,
        judgements: [
          ...state.judgements.filter((judgement) => !isPair(judgement, a, b)),
          { positionIds: orderedPair(a, b), compatible: event.payload.compatible },
        ],
      }
    }
  }
}

/** A position that is gone takes the verdicts on it with it */
function positionGone(state: SubjectState, positionId: string, at: Date): SubjectState {
  return {
    ...mapPosition(state, positionId, (p) => ({ ...p, deletedAt: at })),
    judgements: state.judgements.filter(({ positionIds }) => !positionIds.includes(positionId)),
  }
}

function mapPosition(
  state: SubjectState,
  positionId: string,
  change: (p: PositionState) => PositionState,
): SubjectState {
  return {
    ...state,
    positions: state.positions.map((p) => (p.position.id === positionId ? change(p) : p)),
  }
}

function subjectFrom(stored: StoredEvent, payload: SubjectContent): Subject {
  return Subject.make({
    id: SubjectId.make(stored.streamId),
    title: SubjectTitle.make(payload.title),
    slug: SubjectSlug.make(payload.slug),
    presentation: payload.presentation,
    problem: payload.problem,
    pictureUrl: payload.pictureUrl,
    createdBy: stored.actorId ?? undefined,
    createdAt: stored.occurredAt,
    updatedAt: stored.occurredAt,
  })
}

/** A position carried over by a merge: added by its author on its day, changed by the merge */
function carriedPositionFrom(
  stored: StoredEvent,
  subjectId: string,
  carried: CarriedPosition,
): Position {
  return Position.make({
    ...positionFrom(stored, subjectId, carried),
    createdBy: carried.createdBy,
    createdAt: new Date(carried.createdAt),
  })
}

function positionFrom(stored: StoredEvent, subjectId: string, payload: PositionContent): Position {
  return Position.make({
    id: PositionId.make(payload.positionId),
    title: PositionTitle.make(payload.title),
    slug: PositionSlug.make(payload.slug),
    description: payload.description,
    subjectId,
    createdBy: stored.actorId ?? undefined,
    createdAt: stored.occurredAt,
    updatedAt: stored.occurredAt,
  })
}
