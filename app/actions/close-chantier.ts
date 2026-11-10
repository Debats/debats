'use server'

import { Either } from 'effect'
import { Chantier } from '../../domain/entities/chantier'
import { closeChantierUseCase } from '../../domain/use-cases/close-chantier'
import { runLive } from '../../infra/live-services'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type CloseChantierResult =
  | { closed: true; chantier: Chantier }
  | { closed: false; message: string }

/** Closes a chantier: no more messages, and the agent is stopped if it was at work */
export async function closeChantierAction(chantierId: unknown): Promise<CloseChantierResult> {
  const contributor = await getAuthenticatedContributor()
  const result = await runLive(
    closeChantierUseCase({
      contributor,
      chantierId: typeof chantierId === 'string' ? chantierId : '',
    }),
  )
  return Either.isRight(result)
    ? { closed: true, chantier: result.right }
    : { closed: false, message: result.left }
}
