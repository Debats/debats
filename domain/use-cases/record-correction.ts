import { Effect, Either, pipe } from 'effect'
import * as S from 'effect/Schema'
import { correct, ReviewedEntity } from '../aggregates/review'
import { EventStore } from '../events/event-store'
import { decoded } from './preconditions'
import { decideOnReview, rewardUpheldFlags } from './review-stream'

/**
 * What the one who edits an entity says of its review, from the edit form:
 * whether her edit answers the open flags (and what she answers them), and
 * whether it changes what readers had confirmed. Nothing follows from the
 * edit alone: both are hers to say.
 */
export const CorrectionForm = S.Struct({
  settlesFlags: S.Boolean,
  answer: S.optional(S.String),
  resetConfirmations: S.Boolean,
})

/** A correction as the edit form sends it */
export type NewCorrection = S.Schema.Encoded<typeof CorrectionForm>

/**
 * Records, in the transaction of an edit, what the editor said of the
 * entity's review: its open flags settled as corrected and their readers
 * rewarded, its confirmations reset. A form that had nothing to say of the
 * review (nobody confirmed or flagged the entity) sends none, and nothing
 * is written.
 */
export function recordCorrection(
  events: EventStore,
  actorId: string,
  entity: ReviewedEntity,
  said: NewCorrection | undefined,
) {
  if (said === undefined) return Effect.void
  return pipe(
    decoded(CorrectionForm)(said),
    Effect.flatMap((correction) =>
      decideOnReview(events, entity.id, actorId, (state) =>
        Either.right(correct(correction)(state)),
      ),
    ),
    Effect.tap(({ before, written }) =>
      written.some((event) => event.type === 'FlagsSettled')
        ? rewardUpheldFlags(events, actorId, entity, before)
        : Effect.void,
    ),
    Effect.asVoid,
  )
}
