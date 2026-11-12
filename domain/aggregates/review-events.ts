import * as S from 'effect/Schema'
import { eventDecoder } from '../events/decode-event'

/**
 * What readers say of an entity of the site: that they checked it
 * (a confirmation) or that something is wrong with it (a flag, with a
 * reason and a comment), and what a moderator made of the flags. One stream
 * per reviewed entity, under the entity's own id; it opens with the first
 * confirmation or flag, so it has no creation event.
 */

/** The kinds of entity a reader may confirm or flag */
export const REVIEWED_ENTITY_TYPES = [
  'statement',
  'subject',
  'public_figure',
  'organisation',
  'position',
  'argument',
] as const
export type ReviewedEntityType = (typeof REVIEWED_ENTITY_TYPES)[number]

/** What a flag reproaches; « other » leaves it to the comment */
export const FLAG_REASONS = [
  'inaccurate_quote',
  'source_mismatch',
  'wrong_position_or_date',
  'duplicate',
  'other',
] as const
export type FlagReason = (typeof FLAG_REASONS)[number]

/** What a moderator made of the open flags */
export const FLAG_OUTCOMES = ['corrected', 'dismissed', 'removed'] as const
export type FlagOutcome = (typeof FLAG_OUTCOMES)[number]

const EntityType = S.Literal(...REVIEWED_ENTITY_TYPES)

/** The actor read the entity against its source and found it right */
export const Confirmed = S.Struct({
  type: S.Literal('Confirmed'),
  payload: S.Struct({ entityType: EntityType }),
})

/** The actor takes her confirmation back */
export const ConfirmationWithdrawn = S.Struct({
  type: S.Literal('ConfirmationWithdrawn'),
  payload: S.Struct({}),
})

const Flag = S.Struct({
  entityType: EntityType,
  flagId: S.String,
  reason: S.Literal(...FLAG_REASONS),
  comment: S.String,
})
export type FlagPayload = S.Schema.Type<typeof Flag>

/** The actor found something wrong and says what */
export const Flagged = S.Struct({ type: S.Literal('Flagged'), payload: Flag })

/** The one who raised the flag takes it back */
export const FlagWithdrawn = S.Struct({
  type: S.Literal('FlagWithdrawn'),
  payload: S.Struct({ flagId: S.String }),
})

/** A moderator closed every open flag at once, with one outcome and one answer */
export const FlagsSettled = S.Struct({
  type: S.Literal('FlagsSettled'),
  payload: S.Struct({
    outcome: S.Literal(...FLAG_OUTCOMES),
    answer: S.optional(S.String),
  }),
})

/** The entity changed enough that what readers had confirmed no longer stands */
export const ConfirmationsReset = S.Struct({
  type: S.Literal('ConfirmationsReset'),
  payload: S.Struct({}),
})

export const ReviewEvent = S.Union(
  Confirmed,
  ConfirmationWithdrawn,
  Flagged,
  FlagWithdrawn,
  FlagsSettled,
  ConfirmationsReset,
)
export type ReviewEvent = S.Schema.Type<typeof ReviewEvent>

/** Reads a stored event as a review event, or says why the journal is corrupt */
export const decodeReviewEvent = eventDecoder(ReviewEvent)
