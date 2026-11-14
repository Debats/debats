import { Effect, pipe } from 'effect'
import { Chantier, isOpen } from '../entities/chantier'
import { DraftStatement } from '../entities/draft-statement'
import { ChantierRepository } from '../repositories/chantier-repository'
import { DraftStatementRepository } from '../repositories/draft-statement-repository'
import { DatabaseError } from '../repositories/errors'
import { reviewNotice } from '../services/review-notice'
import { reviewsDelivered } from './chantier-delivery'
import { allowedTo, found } from './preconditions'
import { ContributorIdentity } from './types'

type NoticeChantierReviewParams = {
  contributor: ContributorIdentity | null
  /** The draft just reviewed, as the site now holds it */
  draftId: string
}

/** Whether the agent was told; it is not when the draft has no chantier, or the chantier no longer listens, or its agent does not hear for now and the notice is kept for later */
export type ReviewNoticed = { told: boolean }

const drafts = Effect.serviceFunctions(DraftStatementRepository)
const chantiers = Effect.serviceFunctions(ChantierRepository)

const NOT_TOLD: ReviewNoticed = { told: false }

/** The notice kept for an agent that did not hear it: told with the next review, or once its budget is pushed further */
const kept = (chantier: Chantier, notice: string) =>
  Effect.as(chantiers.keepUnheard(chantier.id, notice), NOT_TOLD)

/**
 * The notice delivered, after those the agent had not heard, or kept when it
 * does not hear this one either. The review stands either way, so neither is
 * a failure of this command: an agent stopped at its budget is where a
 * chantier is expected to end up, and one that cannot be reached has been
 * reported by its adapter.
 */
const told = (chantier: Chantier, notice: string, by: string) =>
  pipe(
    reviewsDelivered(chantier, by, [notice]),
    Effect.as<ReviewNoticed>({ told: true }),
    Effect.catchTags({
      BudgetReached: () => kept(chantier, notice),
      AgentUnavailable: () => kept(chantier, notice),
    }),
  )

/**
 * After a person has reviewed a draft, the agent of its chantier hears the
 * decision: what was validated and what that created, what was rejected and
 * why, what is sent back and what to fix. A draft without a chantier, or
 * whose chantier is closed or over, has no one to tell; an agent that does
 * not hear for now is told later.
 */
export function noticeChantierReviewUseCase(params: NoticeChantierReviewParams) {
  const listening = (
    draft: DraftStatement,
  ): Effect.Effect<Chantier | null, DatabaseError, ChantierRepository> =>
    draft.chantierId
      ? Effect.map(chantiers.findById(draft.chantierId), (chantier) =>
          chantier && isOpen(chantier) ? chantier : null,
        )
      : Effect.succeed(null)

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'admin', 'prévenir un chantier'),
      draft: Effect.flatMap(drafts.findById(params.draftId), found('Brouillon introuvable.')),
    }),
    Effect.flatMap(({ contributor, draft }) => {
      const notice = reviewNotice(draft)
      if (!notice) return Effect.succeed(NOT_TOLD)
      return Effect.flatMap(listening(draft), (chantier) =>
        chantier ? told(chantier, notice, contributor.id) : Effect.succeed(NOT_TOLD),
      )
    }),
  )
}
