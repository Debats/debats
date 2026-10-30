import * as S from 'effect/Schema'
import { ORGANISATION_TYPES } from '../entities/organisation'
import { eventDecoder } from '../events/decode-event'

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

export const OrganisationEdited = S.Struct({
  type: S.Literal('OrganisationEdited'),
  payload: OrganisationContent,
})

export const OrganisationDeleted = S.Struct({
  type: S.Literal('OrganisationDeleted'),
  payload: S.Struct({}),
})

export const OrganisationEvent = S.Union(OrganisationAdded, OrganisationEdited, OrganisationDeleted)
export type OrganisationEvent = S.Schema.Type<typeof OrganisationEvent>

/** Reads a stored event as an organisation event, or says why the journal is corrupt */
export const decodeOrganisationEvent = eventDecoder(OrganisationEvent)
