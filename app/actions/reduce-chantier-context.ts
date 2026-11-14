'use server'

import { Either } from 'effect'
import { Chantier } from '../../domain/entities/chantier'
import { reduceChantierContextUseCase } from '../../domain/use-cases/reduce-chantier-context'
import { runLive } from '../../infra/live-services'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ReduceChantierContextResult =
  | { reduced: true; chantier: Chantier }
  | { reduced: false; message: string }

/** Has the agent of a chantier carry on in a new session, told what its thread said so far */
export async function reduceChantierContextAction(
  chantierId: unknown,
): Promise<ReduceChantierContextResult> {
  const contributor = await getAuthenticatedContributor()
  const result = await runLive(
    reduceChantierContextUseCase({
      contributor,
      chantierId: typeof chantierId === 'string' ? chantierId : '',
    }),
  )
  return Either.isRight(result)
    ? { reduced: true, chantier: result.right }
    : { reduced: false, message: result.left }
}
