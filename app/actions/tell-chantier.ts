'use server'

import { Either } from 'effect'
import { Chantier, ChantierMessage } from '../../domain/entities/chantier'
import { tellChantierUseCase } from '../../domain/use-cases/tell-chantier'
import { runLive } from '../../infra/live-services'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type TellChantierResult =
  | { sent: true; chantier: Chantier; messages: ChantierMessage[] }
  | { sent: false; message: string }

/** Sends a person's message to the agent of a chantier, and mirrors it once the agent took it */
export async function tellChantierAction(
  chantierId: unknown,
  text: unknown,
): Promise<TellChantierResult> {
  const contributor = await getAuthenticatedContributor()
  const result = await runLive(
    tellChantierUseCase({
      contributor,
      chantierId: typeof chantierId === 'string' ? chantierId : '',
      text: typeof text === 'string' ? text : '',
    }),
  )
  return Either.isRight(result)
    ? { sent: true, chantier: result.right.chantier, messages: result.right.messages }
    : { sent: false, message: result.left }
}
