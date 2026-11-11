import { Effect, pipe } from 'effect'
import { Chantier } from '../entities/chantier'
import { ChantierRepository } from '../repositories/chantier-repository'
import { ChantierAgent } from '../services/chantier-agent'
import { chantierFound } from './chantier-preconditions'
import { allowedTo } from './preconditions'
import { ContributorIdentity } from './types'

type DeleteChantierParams = {
  contributor: ContributorIdentity | null
  chantierId: string
}

const chantiers = Effect.serviceFunctions(ChantierRepository)
const agent = Effect.serviceFunctions(ChantierAgent)

/**
 * A person deletes a chantier for good: its session is erased where it ran,
 * then the chantier goes with its conversation and the drafts it produced.
 * What a validated draft created (subjects, figures, statements) is not the
 * chantier's and stays. The session goes first: a chantier whose session
 * cannot be erased is kept, with the reason, rather than left running
 * unseen on the other side.
 */
export function deleteChantierUseCase(params: DeleteChantierParams) {
  const forget = (chantier: Chantier) =>
    chantier.sessionId ? agent.forget(chantier.sessionId) : Effect.void

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'admin', 'supprimer un chantier'),
      chantier: chantierFound(params.chantierId),
    }),
    Effect.flatMap(({ chantier }) =>
      pipe(
        forget(chantier),
        Effect.flatMap(() => chantiers.delete(chantier.id)),
      ),
    ),
  )
}
