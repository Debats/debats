import { Effect, pipe } from 'effect'
import { Chantier } from '../entities/chantier'
import { ChantierRepository } from '../repositories/chantier-repository'
import { ChantierAgent } from '../services/chantier-agent'
import { AgentSpend, SpendReading } from '../services/chantier-budget'

const chantiers = Effect.serviceFunctions(ChantierRepository)
const agent = Effect.serviceFunctions(ChantierAgent)

/**
 * What the agent of a chantier spent against its cap, for the list of
 * chantiers and for the page of a closed one. The figures live in the
 * session, and move as long as the chantier is open: an open chantier is
 * asked every time. A closed one no longer spends once its session is at
 * rest: it is asked until then, what it answers at rest is kept, and the
 * session is left alone from then on.
 *
 * A session that does not answer costs the page its bar, nothing else: the
 * adapter has already reported why.
 */
export function chantierSpend(chantier: Chantier) {
  const { sessionId } = chantier
  if (!sessionId) return Effect.succeed<AgentSpend | null>(null)
  if (chantier.status !== 'closed') return Effect.map(asked(sessionId), ({ spend }) => spend)
  if (chantier.spend) return Effect.succeed<AgentSpend | null>(chantier.spend)
  return pipe(
    asked(sessionId),
    /* Closed while at work, the agent finishes the request it was stopped on: kept now, the figure would miss it for good */
    Effect.tap(({ spend, settled }) =>
      spend && settled ? chantiers.keepSpend(chantier.id, spend) : Effect.void,
    ),
    Effect.map(({ spend }) => spend),
  )
}

const UNKNOWN: SpendReading = { spend: null, settled: false }

const asked = (sessionId: string) =>
  Effect.catchAll(agent.spend(sessionId), () => Effect.succeed(UNKNOWN))
