'use server'

import { Either } from 'effect'
import { Chantier } from '../../domain/entities/chantier'
import { launchChantierUseCase } from '../../domain/use-cases/launch-chantier'
import { runLive } from '../../infra/live-services'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type LaunchChantierResult =
  | { launched: true; chantier: Chantier }
  | { launched: false; message: string }

/** Opens a chantier on a brief; the agent's first answer arrives on the chantier's page */
export async function launchChantierAction(brief: unknown): Promise<LaunchChantierResult> {
  const contributor = await getAuthenticatedContributor()
  const result = await runLive(
    launchChantierUseCase({ contributor, brief: typeof brief === 'string' ? brief : '' }),
  )
  return Either.isRight(result)
    ? { launched: true, chantier: result.right }
    : { launched: false, message: result.left }
}
