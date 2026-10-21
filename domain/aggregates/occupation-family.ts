import { Either, pipe } from 'effect'
import {
  generateOccupationSlug,
  Occupation,
  OccupationId,
  OccupationName,
  OccupationSlug,
} from '../entities/occupation'
import {
  generateOccupationFamilySlug,
  OccupationFamily,
  OccupationFamilyId,
  OccupationFamilyName,
  OccupationFamilySlug,
} from '../entities/occupation-family'
import { StoredEvent, StreamRef, UnreadableEvent } from '../events/event-store'
import {
  decodeOccupationFamilyEvent,
  FamilyContent,
  OccupationContent,
  OccupationFamilyEvent,
} from './occupation-family-events'

export const OCCUPATION_FAMILY_STREAM = 'occupation_family'

export const occupationFamilyStream = (id: string): StreamRef => ({
  streamType: OCCUPATION_FAMILY_STREAM,
  streamId: id,
})

/** What the journal says a family and its occupations are right now */
export interface OccupationFamilyState {
  family: OccupationFamily
  occupations: Occupation[]
  deletedAt: Date | null
}

export interface FamilyInput {
  name: string
  description: string
  position: number
}

export interface OccupationInput {
  name: string
  description: string
}

/** Decision: an Idéaliste adds a family (its id is chosen by the caller, as the stream's) */
export const addOccupationFamily = (input: FamilyInput): OccupationFamilyEvent => ({
  type: 'OccupationFamilyAdded',
  payload: familyContent(input),
})

/** Decision: an Idéaliste adds an occupation to the family, under the id the caller chose */
export const addOccupation = (
  occupationId: string,
  input: OccupationInput,
): OccupationFamilyEvent => ({
  type: 'OccupationAdded',
  payload: occupationContent(occupationId, input),
})

export const removeOccupation = (occupationId: string): OccupationFamilyEvent => ({
  type: 'OccupationRemoved',
  payload: { occupationId },
})

export const deleteOccupationFamily = (): OccupationFamilyEvent => ({
  type: 'OccupationFamilyDeleted',
  payload: {},
})

/** A family found in the table before its journal existed enters it as it is */
export const importOccupationFamily = (family: OccupationFamily): OccupationFamilyEvent => ({
  type: 'OccupationFamilyImported',
  payload: familyContent(family),
})

export const importOccupation = (occupation: Occupation): OccupationFamilyEvent => ({
  type: 'OccupationImported',
  payload: occupationContent(occupation.id, occupation),
})

function familyContent(input: FamilyInput): FamilyContent {
  const name = input.name.trim()
  return {
    name,
    slug: generateOccupationFamilySlug(name),
    description: input.description.trim(),
    position: input.position,
  }
}

function occupationContent(occupationId: string, input: OccupationInput): OccupationContent {
  const name = input.name.trim()
  return {
    occupationId,
    name,
    slug: generateOccupationSlug(name),
    description: input.description.trim(),
  }
}

/** Rebuilds the family from its stream; null for a stream without events */
export function replayOccupationFamily(
  events: StoredEvent[],
): Either.Either<OccupationFamilyState | null, UnreadableEvent> {
  return Either.map(
    Either.all(
      events.map((stored) =>
        pipe(
          decodeOccupationFamilyEvent(stored),
          Either.flatMap((event) => requireAuthorOfCreation(stored, event)),
          Either.map(withMeta(stored)),
        ),
      ),
    ),
    (decoded) => decoded.reduce(apply, null),
  )
}

const CREATIONS = new Set<OccupationFamilyEvent['type']>([
  'OccupationFamilyAdded',
  'OccupationFamilyImported',
  'OccupationAdded',
  'OccupationImported',
])

/** Families and occupations always have an author (the columns are not null) */
function requireAuthorOfCreation(
  stored: StoredEvent,
  event: OccupationFamilyEvent,
): Either.Either<OccupationFamilyEvent, UnreadableEvent> {
  return CREATIONS.has(event.type) && !stored.actorId
    ? Either.left(new UnreadableEvent(stored, 'a family or an occupation needs an author'))
    : Either.right(event)
}

interface DecodedEvent {
  event: OccupationFamilyEvent
  stored: StoredEvent
}

const withMeta = (stored: StoredEvent) => (event: OccupationFamilyEvent) => ({ event, stored })

function apply(
  state: OccupationFamilyState | null,
  { event, stored }: DecodedEvent,
): OccupationFamilyState | null {
  switch (event.type) {
    case 'OccupationFamilyAdded':
    case 'OccupationFamilyImported':
      return { family: familyFrom(stored, event.payload), occupations: [], deletedAt: null }
    case 'OccupationAdded':
    case 'OccupationImported':
      return (
        state && {
          ...state,
          occupations: [...state.occupations, occupationFrom(stored, event.payload)],
        }
      )
    case 'OccupationRemoved':
      return (
        state && {
          ...state,
          occupations: state.occupations.filter((o) => o.id !== event.payload.occupationId),
        }
      )
    case 'OccupationFamilyDeleted':
      return state && { ...state, deletedAt: stored.occurredAt }
  }
}

function familyFrom(stored: StoredEvent, payload: FamilyContent): OccupationFamily {
  return OccupationFamily.make({
    id: OccupationFamilyId.make(stored.streamId),
    name: OccupationFamilyName.make(payload.name),
    slug: OccupationFamilySlug.make(payload.slug),
    description: payload.description,
    position: payload.position,
    // Checked by requireAuthorOfCreation before any event is applied
    createdBy: stored.actorId!,
    updatedBy: stored.actorId!,
    createdAt: stored.occurredAt,
    updatedAt: stored.occurredAt,
  })
}

function occupationFrom(stored: StoredEvent, payload: OccupationContent): Occupation {
  return Occupation.make({
    id: OccupationId.make(payload.occupationId),
    name: OccupationName.make(payload.name),
    slug: OccupationSlug.make(payload.slug),
    familyId: OccupationFamilyId.make(stored.streamId),
    description: payload.description,
    createdBy: stored.actorId!,
    updatedBy: stored.actorId!,
    createdAt: stored.occurredAt,
    updatedAt: stored.occurredAt,
  })
}
