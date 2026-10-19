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
import { StoredEvent, StreamRef, UnreadableEvent } from '../events/event-store'
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

/** Decision: a contributor adds a subject (its id is chosen by the caller, as the stream's) */
export const addSubject = (input: SubjectInput): SubjectEvent => ({
  type: 'SubjectAdded',
  payload: { ...input, slug: generateSubjectSlug(input.title) },
})

export const editSubject = (input: SubjectInput): SubjectEvent => ({
  type: 'SubjectEdited',
  payload: { ...input, slug: generateSubjectSlug(input.title) },
})

export const setSubjectThemes = (themes: readonly ThemeAssignmentPayload[]): SubjectEvent => ({
  type: 'SubjectThemesSet',
  payload: { themes: [...themes] },
})

export const linkSubject = (subjectId: string): SubjectEvent => ({
  type: 'SubjectLinked',
  payload: { subjectId },
})

export const unlinkSubject = (subjectId: string): SubjectEvent => ({
  type: 'SubjectUnlinked',
  payload: { subjectId },
})

export const addPosition = (input: PositionInput): SubjectEvent => ({
  type: 'PositionAdded',
  payload: { ...input, slug: generatePositionSlug(input.title) },
})

export const editPosition = (input: PositionInput): SubjectEvent => ({
  type: 'PositionEdited',
  payload: { ...input, slug: generatePositionSlug(input.title) },
})

export const mergePosition = (sourceId: string, targetId: string): SubjectEvent => ({
  type: 'PositionMergedInto',
  payload: { sourceId, targetId },
})

export const deleteSubject = (): SubjectEvent => ({ type: 'SubjectDeleted', payload: {} })

/** A subject found in the tables before its journal existed enters it as it is */
export const importSubject = (subject: Subject): SubjectEvent => ({
  type: 'SubjectImported',
  payload: {
    title: subject.title,
    slug: subject.slug,
    presentation: subject.presentation,
    problem: subject.problem,
    ...(subject.pictureUrl ? { pictureUrl: subject.pictureUrl } : {}),
  },
})

export const importPosition = (position: Position): SubjectEvent => ({
  type: 'PositionImported',
  payload: {
    positionId: position.id,
    title: position.title,
    slug: position.slug,
    description: position.description,
  },
})

/** Rebuilds the subject from its stream; null for a stream without events */
export function replaySubject(
  events: StoredEvent[],
): Either.Either<SubjectState | null, UnreadableEvent> {
  return Either.map(
    Either.all(events.map((stored) => Either.map(decodeSubjectEvent(stored), withMeta(stored)))),
    (decoded) => decoded.reduce(apply, null),
  )
}

interface DecodedEvent {
  event: SubjectEvent
  stored: StoredEvent
}

const withMeta = (stored: StoredEvent) => (event: SubjectEvent) => ({ event, stored })

function apply(state: SubjectState | null, { event, stored }: DecodedEvent): SubjectState | null {
  switch (event.type) {
    case 'SubjectAdded':
    case 'SubjectImported':
      return {
        subject: subjectFrom(stored, event.payload),
        positions: [],
        themes: [],
        relatedSubjectIds: [],
        deletedAt: null,
      }
    case 'SubjectDeleted':
      // The positions go with their subject
      return (
        state && {
          ...state,
          deletedAt: stored.occurredAt,
          positions: state.positions.map((p) =>
            p.deletedAt ? p : { ...p, deletedAt: stored.occurredAt },
          ),
        }
      )
  }
  if (!state) return null
  switch (event.type) {
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
    case 'PositionImported':
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
