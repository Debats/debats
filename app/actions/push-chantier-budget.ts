'use server'

import { Either } from 'effect'
import {
  PushedChantierBudget,
  pushChantierBudgetUseCase,
} from '../../domain/use-cases/push-chantier-budget'
import { runLive } from '../../infra/live-services'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type PushChantierBudgetResult =
  | ({ pushed: true } & PushedChantierBudget)
  | { pushed: false; message: string }

/** Lets the agent of a chantier spend one step more than its cap allowed */
export async function pushChantierBudgetAction(
  chantierId: unknown,
): Promise<PushChantierBudgetResult> {
  const contributor = await getAuthenticatedContributor()
  const result = await runLive(
    pushChantierBudgetUseCase({
      contributor,
      chantierId: typeof chantierId === 'string' ? chantierId : '',
    }),
  )
  return Either.isRight(result)
    ? { pushed: true, ...result.right }
    : { pushed: false, message: result.left }
}
