import * as Sentry from '@sentry/nextjs'
import { Either } from 'effect'
import { noticeChantierReviewUseCase } from '../../domain/use-cases/notice-chantier-review'
import { runLive } from '../../infra/live-services'
import { ContributorIdentity } from '../../domain/use-cases/types'

/**
 * After a review, the decision is kept for the agent of the draft's
 * chantier, which hears it when the person hands her reviews over. The
 * review itself stands whatever happens here; what is reported is a notice
 * that could not be kept, which no review should lead to.
 */
export async function chantierToldOfReview(
  draftId: string,
  contributor: ContributorIdentity | null,
): Promise<void> {
  const result = await runLive(noticeChantierReviewUseCase({ contributor, draftId }))
  if (Either.isLeft(result)) {
    Sentry.captureMessage(`Review not kept for its chantier: ${result.left}`, {
      level: 'warning',
      tags: { feature: 'chantier' },
      extra: { draftId },
    })
  }
}
