import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { ReviewedEntity, settle, Settlement } from '../aggregates/review'
import { withdrawStatement } from '../aggregates/statement'
import { EventStore } from '../events/event-store'
import { runUnitOfWork } from '../events/unit-of-work'
import { allowedTo, decoded } from './preconditions'
import { decideOnReview, rewardUpheldFlags } from './review-stream'
import { decideOnStatement } from './statement-stream'
import { ContributorIdentity, Rejected } from './types'

export const NOT_REMOVABLE =
  'Seule une prise de position peut être retirée depuis un signalement. Corrigez ce contenu, ou écartez le signalement.'

/**
 * What the settlement form says: how the flags are closed, what the moderator
 * checked (shown with the flags it closes), and the revision of the review
 * her page was rendered from, so a flag raised since is not settled unread.
 */
export const SettlementForm = S.Struct({
  outcome: S.Literal('dismissed', 'removed'),
  answer: S.String,
  revision: S.NonNegativeInt,
})

/** A settlement as the form sends it */
export type NewSettlement = S.Schema.Encoded<typeof SettlementForm>

type SettleFlagsParams = NewSettlement & {
  contributor: ContributorIdentity | null
  entity: ReviewedEntity
}

/** Only a statement leaves the site from here: removing anything else takes its own command */
const removable = (entity: ReviewedEntity, outcome: Settlement) =>
  outcome === 'removed' && entity.type !== 'statement'
    ? Effect.fail(new Rejected(NOT_REMOVABLE))
    : Effect.void

/**
 * The statement leaves the site. One already gone (its subject was deleted
 * meanwhile) has nothing left to remove: the flags are settled all the same,
 * instead of staying open on nothing.
 */
const withdrawn = (events: EventStore, entity: ReviewedEntity, moderatorId: string) =>
  pipe(
    decideOnStatement(events, entity.id, moderatorId, withdrawStatement()),
    Effect.catchTag('NotFound', () => Effect.void),
  )

/**
 * A moderator closes the open flags of an entity without editing it: they
 * do not hold (dismissed, the entity stays as it is) or the entity is beyond
 * repair (removed, in the same transaction, and the readers who flagged it
 * are rewarded). Either way she answers for it, and for the flags she read:
 * a review that moved since her page was rendered is refused. A correction
 * goes through the entity's own edit, which settles the flags as it writes.
 */
export function settleFlagsUseCase({ contributor, entity, ...form }: SettleFlagsParams) {
  return pipe(
    Effect.all({
      moderator: allowedTo(contributor, 'settle_flag', 'traiter un signalement'),
      // What arrives from a form has no type: a correction is never settled from here
      settlement: decoded(SettlementForm)(form),
    }),
    Effect.tap(({ settlement }) => removable(entity, settlement.outcome)),
    Effect.flatMap(({ moderator, settlement: { outcome, answer, revision } }) =>
      runUnitOfWork((events) =>
        pipe(
          decideOnReview(events, entity.id, moderator.id, settle(outcome, answer), revision),
          Effect.tap(({ before }) =>
            outcome === 'removed'
              ? pipe(
                  withdrawn(events, entity, moderator.id),
                  Effect.andThen(rewardUpheldFlags(events, moderator.id, entity, before)),
                )
              : Effect.void,
          ),
        ),
      ),
    ),
    Effect.asVoid,
  )
}
