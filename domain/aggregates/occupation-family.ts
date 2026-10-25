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
import { StoredEvent, StreamRef } from '../events/event-store'
import {
  decodeOccupationFamilyEvent,
  FamilyContent,
  OccupationContent,
  OccupationFamilyEvent,
} from './occupation-family-events'
import { authored, authorOf, Decoded, replayStream } from './replay'

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

/**
 * Rebuilds the family from its stream; null for a stream without events.
 * Families and occupations always have an author (the columns are not null).
 */
export const replayOccupationFamily = replayStream(
  decodeOccupationFamilyEvent,
  apply,
  authored(
    ['OccupationFamilyAdded', 'OccupationFamilyImported', 'OccupationAdded', 'OccupationImported'],
    'a family or an occupation',
  ),
)

function apply(
  state: OccupationFamilyState | null,
  { event, stored }: Decoded<OccupationFamilyEvent>,
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
    createdBy: authorOf(stored),
    updatedBy: authorOf(stored),
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
    createdBy: authorOf(stored),
    updatedBy: authorOf(stored),
    createdAt: stored.occurredAt,
    updatedAt: stored.occurredAt,
  })
}
