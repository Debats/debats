import * as S from 'effect/Schema'
import { Either } from 'effect'
import { ORGANISATION_TYPES } from '../entities/organisation'
import { StoredEvent, UnreadableEvent } from '../events/event-store'

/**
 * An organisation is a stream of its own. Its affiliations live in the
 * streams of the public figures they bind, its statements in theirs.
 */

const OrganisationContent = S.Struct({
  name: S.String,
  slug: S.String,
  acronym: S.optional(S.String),
  organisationType: S.Literal(...ORGANISATION_TYPES),
  presentation: S.String,
  wikipediaUrl: S.optional(S.String),
  websiteUrl: S.optional(S.String),
  notorietySources: S.Array(S.String),
})
export type OrganisationContent = S.Schema.Type<typeof OrganisationContent>

export const OrganisationAdded = S.Struct({
  type: S.Literal('OrganisationAdded'),
  payload: OrganisationContent,
})

/** The organisation existed before the journal; this is the state it was found in */
export const OrganisationImported = S.Struct({
  type: S.Literal('OrganisationImported'),
  payload: OrganisationContent,
})

export const OrganisationEdited = S.Struct({
  type: S.Literal('OrganisationEdited'),
  payload: OrganisationContent,
})

export const OrganisationDeleted = S.Struct({
  type: S.Literal('OrganisationDeleted'),
  payload: S.Struct({}),
})

export const OrganisationEvent = S.Union(
  OrganisationAdded,
  OrganisationImported,
  OrganisationEdited,
  OrganisationDeleted,
)
export type OrganisationEvent = S.Schema.Type<typeof OrganisationEvent>

const decode = S.decodeUnknownEither(OrganisationEvent)

/** Reads a stored event as an organisation event, or says why the journal is corrupt */
export function decodeOrganisationEvent(
  event: StoredEvent,
): Either.Either<OrganisationEvent, UnreadableEvent> {
  return Either.mapLeft(
    decode({ type: event.type, payload: event.payload }),
    (error) => new UnreadableEvent(event, error.message),
  )
}
