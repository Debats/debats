import { Effect, pipe } from 'effect'
import { Chantier, ChantierMessageRole } from '../entities/chantier'
import { ChantierRepository } from '../repositories/chantier-repository'
import { ChantierAgent } from '../services/chantier-agent'
import { sessionOf } from './chantier-preconditions'

const chantiers = Effect.serviceFunctions(ChantierRepository)
const agent = Effect.serviceFunctions(ChantierAgent)

/**
 * A line delivered to the agent of a chantier, then kept in its thread. The
 * session hears it first: a line the session refuses is not mirrored, so the
 * conversation on the site never claims more than the agent heard. The agent
 * is then at work on it, whatever it was doing.
 */
export function deliveredToChantier(
  chantier: Chantier,
  role: ChantierMessageRole,
  text: string,
  by: string,
) {
  return pipe(
    sessionOf(chantier),
    Effect.flatMap((sessionId) => agent.tell(sessionId, text)),
    Effect.flatMap(() => chantiers.addMessages(chantier.id, [{ role, text, eventId: null }])),
    Effect.flatMap((messages) =>
      pipe(
        chantiers.update(chantier.id, { status: 'working' }, by),
        Effect.map((updated) => ({ chantier: updated ?? chantier, messages })),
      ),
    ),
  )
}
