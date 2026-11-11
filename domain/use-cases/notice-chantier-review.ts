import { Effect, pipe } from 'effect'
import { Chantier, isOpen } from '../entities/chantier'
import { DraftStatement } from '../entities/draft-statement'
import { ChantierRepository } from '../repositories/chantier-repository'
import { DraftStatementRepository } from '../repositories/draft-statement-repository'
import { DatabaseError } from '../repositories/errors'
import { reviewNotice } from '../services/review-notice'
import { deliveredToChantier } from './chantier-delivery'
import { allowedTo, found } from './preconditions'
import { ContributorIdentity } from './types'

type NoticeChantierReviewParams = {
  contributor: ContributorIdentity | null
  /** The draft just reviewed, as the site now holds it */
  draftId: string
}

/** Whether the agent was told; it is not when the draft has no chantier, or the chantier no longer listens */
export type ReviewNoticed = { told: boolean }

const drafts = Effect.serviceFunctions(DraftStatementRepository)
const chantiers = Effect.serviceFunctions(ChantierRepository)

const NOT_TOLD: ReviewNoticed = { told: false }

/**
 * After a person has reviewed a draft, the agent of its chantier hears the
 * decision: what was validated and what that created, what was rejected and
 * why, what is sent back and what to fix. A draft without a chantier, or
 * whose chantier is closed or over, has no one to tell.
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
        chantier
          ? Effect.as(deliveredToChantier(chantier, 'review', notice, contributor.id), {
              told: true,
            })
          : Effect.succeed(NOT_TOLD),
      )
    }),
  )
}
