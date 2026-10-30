import * as S from 'effect/Schema'
import { eventDecoder } from '../events/decode-event'

/**
 * The public figure is the root of one stream that also carries the
 * occupations she holds and her affiliations to organisations: everything a
 * decision on a figure needs. Her statements have their own streams.
 */

const IsoDate = S.String.pipe(S.pattern(/^\d{4}-\d{2}-\d{2}$/))

const PublicFigureContent = S.Struct({
  name: S.String,
  slug: S.String,
  presentation: S.String,
  wikipediaUrl: S.optional(S.String),
  websiteUrl: S.optional(S.String),
  notorietySources: S.Array(S.String),
})
export type PublicFigureContent = S.Schema.Type<typeof PublicFigureContent>

export const PublicFigureAdded = S.Struct({
  type: S.Literal('PublicFigureAdded'),
  payload: PublicFigureContent,
})

export const PublicFigureEdited = S.Struct({
  type: S.Literal('PublicFigureEdited'),
  payload: PublicFigureContent,
})

const OccupationAssignment = S.Struct({ occupationId: S.String, current: S.Boolean })
export type OccupationAssignmentPayload = S.Schema.Type<typeof OccupationAssignment>

/** The whole set of occupations held, current or former, replaced at once */
export const OccupationsSet = S.Struct({
  type: S.Literal('OccupationsSet'),
  payload: S.Struct({ occupations: S.Array(OccupationAssignment) }),
})

const MembershipContent = S.Struct({
  membershipId: S.String,
  organisationId: S.String,
  role: S.optional(S.String),
  startedOn: S.optional(IsoDate),
  endedOn: S.optional(IsoDate),
})
export type MembershipContent = S.Schema.Type<typeof MembershipContent>

export const MembershipAdded = S.Struct({
  type: S.Literal('MembershipAdded'),
  payload: MembershipContent,
})

/** A wrong affiliation goes away; a real one that ended keeps its end date */
export const MembershipRemoved = S.Struct({
  type: S.Literal('MembershipRemoved'),
  payload: S.Struct({ membershipId: S.String }),
})

export const PublicFigureDeleted = S.Struct({
  type: S.Literal('PublicFigureDeleted'),
  payload: S.Struct({}),
})

export const PublicFigureEvent = S.Union(
  PublicFigureAdded,
  PublicFigureEdited,
  OccupationsSet,
  MembershipAdded,
  MembershipRemoved,
  PublicFigureDeleted,
)
export type PublicFigureEvent = S.Schema.Type<typeof PublicFigureEvent>

/** Reads a stored event as a public figure event, or says why the journal is corrupt */
export const decodePublicFigureEvent = eventDecoder(PublicFigureEvent)
