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
import { always, Decision, refused } from './decision'
import { Decoded, replayStream } from './replay'
import {
  decodeSubjectEvent,
  PositionContent,
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

/** What the journal says a subject is right now, positions included */
export interface SubjectState {
  subject: Subject
  positions: readonly PositionState[]
  themes: readonly ThemeAssignmentPayload[]
  relatedSubjectIds: readonly string[]
  deletedAt: Date | null
}

/** The positions still open on the subject */
export const livePositions = (state: SubjectState): Position[] =>
  state.positions.filter((p) => p.deletedAt === null).map((p) => p.position)

export const findPosition = (state: SubjectState, positionId: string): Position | undefined =>
  livePositions(state).find((p) => p.id === positionId)

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

export const subjectDeleted = (): SubjectEvent => ({ type: 'SubjectDeleted', payload: {} })

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

/** Both positions must still be open on the subject; the source disappears into the target */
export const mergePositions =
  (sourceId: string, targetId: string): SubjectDecision =>
  (state) =>
    findPosition(state, sourceId) && findPosition(state, targetId)
      ? Either.right([positionMergedInto(sourceId, targetId)])
      : refused(POSITION_GONE)

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
        themes: [],
        relatedSubjectIds: [],
        deletedAt: null,
      }
  }
  if (!state) return null
  switch (event.type) {
    case 'SubjectDeleted':
      // The positions go with their subject
      return {
        ...state,
        deletedAt: stored.occurredAt,
        positions: state.positions.map((p) =>
          p.deletedAt ? p : { ...p, deletedAt: stored.occurredAt },
        ),
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
      return mapPosition(state, event.payload.sourceId, (p) => ({
        ...p,
        deletedAt: stored.occurredAt,
      }))
    case 'PositionRemoved':
      return mapPosition(state, event.payload.positionId, (p) => ({
        ...p,
        deletedAt: stored.occurredAt,
      }))
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
