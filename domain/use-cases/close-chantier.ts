import { Effect, pipe } from 'effect'
import { Chantier } from '../entities/chantier'
import { ChantierRepository } from '../repositories/chantier-repository'
import { ChantierAgent } from '../services/chantier-agent'
import { chantierFound } from './chantier-preconditions'
import { allowedTo } from './preconditions'
import { ContributorIdentity } from './types'

type CloseChantierParams = {
  contributor: ContributorIdentity | null
  chantierId: string
}

const chantiers = Effect.serviceFunctions(ChantierRepository)
const agent = Effect.serviceFunctions(ChantierAgent)

/**
 * A person closes a chantier: it takes no more messages, and the agent is
 * stopped if it was at work. The chantier is closed on the site first: the
 * person's decision stands even when the agent cannot be reached, and that
 * failure is told.
 */
export function closeChantierUseCase(params: CloseChantierParams) {
  const stop = (chantier: Chantier) =>
    chantier.sessionId && chantier.status === 'working'
      ? agent.interrupt(chantier.sessionId)
      : Effect.void

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'admin', 'clôturer un chantier'),
      chantier: chantierFound(params.chantierId),
    }),
    Effect.flatMap(({ contributor, chantier }) =>
      pipe(
        chantiers.update(chantier.id, { status: 'closed' }, contributor.id),
        Effect.map((closed) => closed ?? { ...chantier, status: 'closed' as const }),
        Effect.tap(() => stop(chantier)),
      ),
    ),
  )
}
