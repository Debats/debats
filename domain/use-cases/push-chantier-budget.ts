import { Effect, pipe } from 'effect'
import { Chantier } from '../entities/chantier'
import { ChantierRepository } from '../repositories/chantier-repository'
import { ChantierAgent } from '../services/chantier-agent'
import { AgentBudget, BUDGET_STEP_CENTS } from '../services/chantier-budget'
import { chantierOpen, sessionOf } from './chantier-preconditions'
import { allowedTo } from './preconditions'
import { ContributorIdentity } from './types'

type PushChantierBudgetParams = {
  contributor: ContributorIdentity | null
  chantierId: string
}

export type PushedChantierBudget = {
  chantier: Chantier
  budget: AgentBudget
}

const chantiers = Effect.serviceFunctions(ChantierRepository)
const agent = Effect.serviceFunctions(ChantierAgent)

/**
 * A person lets the agent of a chantier spend one step more. The cap is a
 * guard, not a wall: whoever follows the chantier decides it is worth
 * going on. An agent that was blocked resumes by itself once it has room,
 * so the chantier reads as at work again; were it blocked by something
 * else, the next news says so. The reviews kept for the agent stay kept:
 * handing them over is another decision, which the person takes apart.
 */
export function pushChantierBudgetUseCase(params: PushChantierBudgetParams) {
  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'admin', 'repousser le budget d’un chantier'),
      chantier: chantierOpen(params.chantierId),
    }),
    Effect.flatMap(({ contributor, chantier }) =>
      pipe(
        sessionOf(chantier),
        Effect.flatMap((sessionId) => agent.pushBudget(sessionId, BUDGET_STEP_CENTS)),
        Effect.flatMap((budget) =>
          chantier.status === 'blocked'
            ? Effect.map(
                chantiers.update(chantier.id, { status: 'working' }, contributor.id),
                (updated) => ({ chantier: updated ?? chantier, budget }),
              )
            : Effect.succeed({ chantier, budget }),
        ),
      ),
    ),
  )
}
