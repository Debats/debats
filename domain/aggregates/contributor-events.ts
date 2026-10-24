import * as S from 'effect/Schema'
import { eventDecoder } from '../events/decode-event'

/**
 * A contributor's stream carries what the site granted her: every move of
 * reputation, with the deed it rewards. The account itself belongs to the
 * authentication service, so the stream has no creation event: it opens
 * with the first grant.
 */

/**
 * The action is kept as free text: the scale (`domain/reputation/permissions.ts`)
 * names today's actions, the history holds older ones too.
 */
const Grant = S.Struct({
  grantId: S.String,
  action: S.String,
  amount: S.Int,
  relatedEntityType: S.optional(S.String),
  relatedEntityId: S.optional(S.String),
})
export type GrantPayload = S.Schema.Type<typeof Grant>

export const ReputationGranted = S.Struct({
  type: S.Literal('ReputationGranted'),
  payload: Grant,
})

export const ContributorEvent = S.Union(ReputationGranted)
export type ContributorEvent = S.Schema.Type<typeof ContributorEvent>

/** Reads a stored event as a contributor event, or says why the journal is corrupt */
export const decodeContributorEvent = eventDecoder(ContributorEvent)
