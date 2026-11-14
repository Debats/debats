import { Effect, pipe } from 'effect'
import { reviewsDelivered } from './chantier-delivery'
import { chantierOpen } from './chantier-preconditions'
import { allowedTo, found } from './preconditions'
import { ContributorIdentity } from './types'

type DeliverChantierReviewsParams = {
  contributor: ContributorIdentity | null
  chantierId: string
}

export const NOTHING_TO_DELIVER = 'Aucun retour n’attend l’agent de ce chantier.'

/**
 * A person hands the agent of a chantier the reviews made since it last
 * heard of any: all of them in one message, the oldest first, and the agent
 * sets to work on them. A review alone never wakes the agent, which reads
 * everything it carries again each time it is woken: the person decides
 * when her reviews are worth that. An agent stopped at its budget says so,
 * and the reviews stay kept.
 */
export function deliverChantierReviewsUseCase(params: DeliverChantierReviewsParams) {
  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'admin', 'transmettre des retours à un chantier'),
      chantier: chantierOpen(params.chantierId),
    }),
    Effect.flatMap(({ contributor, chantier }) => reviewsDelivered(chantier, contributor.id)),
    Effect.flatMap(found(NOTHING_TO_DELIVER)),
  )
}
