'use server'

import { Either } from 'effect'
import { Chantier, ChantierMessage } from '../../domain/entities/chantier'
import { deliverChantierReviewsUseCase } from '../../domain/use-cases/deliver-chantier-reviews'
import { runLive } from '../../infra/live-services'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type DeliverChantierReviewsResult =
  | { delivered: true; chantier: Chantier; messages: ChantierMessage[] }
  | { delivered: false; message: string }

/** Hands the agent of a chantier the reviews kept for it, all in one message */
export async function deliverChantierReviewsAction(
  chantierId: unknown,
): Promise<DeliverChantierReviewsResult> {
  const contributor = await getAuthenticatedContributor()
  const result = await runLive(
    deliverChantierReviewsUseCase({
      contributor,
      chantierId: typeof chantierId === 'string' ? chantierId : '',
    }),
  )
  return Either.isRight(result)
    ? { delivered: true, chantier: result.right.chantier, messages: result.right.messages }
    : { delivered: false, message: result.left }
}
