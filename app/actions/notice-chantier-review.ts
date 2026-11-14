import * as Sentry from '@sentry/nextjs'
import { Either } from 'effect'
import { noticeChantierReviewUseCase } from '../../domain/use-cases/notice-chantier-review'
import { runLive } from '../../infra/live-services'
import { ContributorIdentity } from '../../domain/use-cases/types'

/**
 * After a review, the agent of the draft's chantier hears the decision. The
 * review itself stands whatever happens here. An agent that does not hear
 * (stopped at its budget, or out of reach and reported by its adapter) is not
 * a failure of the notice, which is kept for later; what is reported here is
 * a notice that could not even be attempted, which no review should lead to.
 */
export async function chantierToldOfReview(
  draftId: string,
  contributor: ContributorIdentity | null,
): Promise<void> {
  const result = await runLive(noticeChantierReviewUseCase({ contributor, draftId }))
  if (Either.isLeft(result)) {
    Sentry.captureMessage(`Chantier not told of a review: ${result.left}`, {
      level: 'warning',
      tags: { feature: 'chantier' },
      extra: { draftId },
    })
  }
}
