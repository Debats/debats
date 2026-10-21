import * as S from 'effect/Schema'
import { Either } from 'effect'
import { StoredEvent, UnreadableEvent } from '../events/event-store'

/**
 * A family of occupations is one stream that also carries its occupations:
 * removing the family removes them, and an occupation cannot change family.
 * Which figures hold an occupation is in their streams (`OccupationsSet`).
 */

const FamilyContent = S.Struct({
  name: S.String,
  slug: S.String,
  description: S.String,
  /** Display order among the families */
  position: S.Int,
})
export type FamilyContent = S.Schema.Type<typeof FamilyContent>

const OccupationContent = S.Struct({
  occupationId: S.String,
  name: S.String,
  slug: S.String,
  description: S.String,
})
export type OccupationContent = S.Schema.Type<typeof OccupationContent>

export const OccupationFamilyAdded = S.Struct({
  type: S.Literal('OccupationFamilyAdded'),
  payload: FamilyContent,
})

/** The family existed before the journal; this is the state it was found in */
export const OccupationFamilyImported = S.Struct({
  type: S.Literal('OccupationFamilyImported'),
  payload: FamilyContent,
})

export const OccupationAdded = S.Struct({
  type: S.Literal('OccupationAdded'),
  payload: OccupationContent,
})

export const OccupationImported = S.Struct({
  type: S.Literal('OccupationImported'),
  payload: OccupationContent,
})

/** The occupation leaves the list; the figures holding it simply lose it */
export const OccupationRemoved = S.Struct({
  type: S.Literal('OccupationRemoved'),
  payload: S.Struct({ occupationId: S.String }),
})

/** The family goes away with its occupations */
export const OccupationFamilyDeleted = S.Struct({
  type: S.Literal('OccupationFamilyDeleted'),
  payload: S.Struct({}),
})

export const OccupationFamilyEvent = S.Union(
  OccupationFamilyAdded,
  OccupationFamilyImported,
  OccupationAdded,
  OccupationImported,
  OccupationRemoved,
  OccupationFamilyDeleted,
)
export type OccupationFamilyEvent = S.Schema.Type<typeof OccupationFamilyEvent>

const decode = S.decodeUnknownEither(OccupationFamilyEvent)

/** Reads a stored event as a family event, or says why the journal is corrupt */
export function decodeOccupationFamilyEvent(
  event: StoredEvent,
): Either.Either<OccupationFamilyEvent, UnreadableEvent> {
  return Either.mapLeft(
    decode({ type: event.type, payload: event.payload }),
    (error) => new UnreadableEvent(event, error.message),
  )
}
