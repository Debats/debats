'use server'

import { Either } from 'effect'
import { Chantier } from '../../domain/entities/chantier'
import { startChantierUseCase } from '../../domain/use-cases/start-chantier'
import { runLive } from '../../infra/live-services'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type StartChantierResult =
  | { started: true; chantier: Chantier }
  | { started: false; message: string }

/** Launches the agent on an adopted chantier: it reads what is there first, then waits for the go */
export async function startChantierAction(chantierId: unknown): Promise<StartChantierResult> {
  const contributor = await getAuthenticatedContributor()
  const result = await runLive(
    startChantierUseCase({
      contributor,
      chantierId: typeof chantierId === 'string' ? chantierId : '',
    }),
  )
  return Either.isRight(result)
    ? { started: true, chantier: result.right }
    : { started: false, message: result.left }
}
