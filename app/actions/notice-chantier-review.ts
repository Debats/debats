import * as Sentry from '@sentry/nextjs'
import { Either } from 'effect'
import { noticeChantierReviewUseCase } from '../../domain/use-cases/notice-chantier-review'
import { runLive } from '../../infra/live-services'
import { ContributorIdentity } from '../../domain/use-cases/types'

/**
 * After a review, the agent of the draft's chantier hears the decision. The
 * review itself stands whatever happens here: an agent that could not be
 * told is reported, not a reason to undo what the person decided.
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
