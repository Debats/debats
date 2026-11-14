import { Effect, pipe } from 'effect'
import { Chantier, hasAgent } from '../entities/chantier'
import { DraftStatement } from '../entities/draft-statement'
import { ChantierRepository } from '../repositories/chantier-repository'
import { DraftStatementRepository } from '../repositories/draft-statement-repository'
import { DatabaseError } from '../repositories/errors'
import { reviewNotice } from '../services/review-notice'
import { allowedTo, found } from './preconditions'
import { ContributorIdentity } from './types'

type NoticeChantierReviewParams = {
  contributor: ContributorIdentity | null
  /** The draft just reviewed, as the site now holds it */
  draftId: string
}

/** Whether a notice was kept for the agent; none is when the draft has no chantier, or when no agent will ever read it */
export type ReviewNoticed = { kept: boolean }

const drafts = Effect.serviceFunctions(DraftStatementRepository)
const chantiers = Effect.serviceFunctions(ChantierRepository)

const NOT_KEPT: ReviewNoticed = { kept: false }

/**
 * After a person has reviewed a draft, what she decided is kept for the
 * agent of its chantier: what was validated and what that created, what was
 * rejected and why, what is sent back and what to fix. The agent is not
 * woken for it: it reads everything it carries again each time it is, and
 * most reviews ask nothing of it. The person hands it her reviews when she
 * chooses (`deliverChantierReviewsUseCase`), all in one message. A draft
 * reviewed again before that keeps its last review only: sent back then
 * validated, it is no longer to be fixed. A draft without a chantier, or whose chantier has no agent to tell, keeps nothing.
 */
export function noticeChantierReviewUseCase(params: NoticeChantierReviewParams) {
  const listening = (
    draft: DraftStatement,
  ): Effect.Effect<Chantier | null, DatabaseError, ChantierRepository> =>
    draft.chantierId
      ? Effect.map(chantiers.findById(draft.chantierId), (chantier) =>
          /* An agent not launched yet will read the drafts as they stand */
          chantier && hasAgent(chantier) ? chantier : null,
        )
      : Effect.succeed(null)

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'admin', 'prévenir un chantier'),
      draft: Effect.flatMap(drafts.findById(params.draftId), found('Brouillon introuvable.')),
    }),
    Effect.flatMap(({ draft }) => {
      const notice = reviewNotice(draft)
      if (!notice) return Effect.succeed(NOT_KEPT)
      return Effect.flatMap(listening(draft), (chantier) =>
        chantier
          ? Effect.map(
              chantiers.keepUnheard(chantier.id, notice, draft.id),
              (): ReviewNoticed => ({ kept: true }),
            )
          : Effect.succeed(NOT_KEPT),
      )
    }),
  )
}
