'use server'

import { Either } from 'effect'
import { deleteChantierUseCase } from '../../domain/use-cases/delete-chantier'
import { runLive } from '../../infra/live-services'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type DeleteChantierResult = { deleted: true } | { deleted: false; message: string }

/** Deletes a chantier for good: its session, its conversation and its drafts */
export async function deleteChantierAction(chantierId: unknown): Promise<DeleteChantierResult> {
  const contributor = await getAuthenticatedContributor()
  const result = await runLive(
    deleteChantierUseCase({
      contributor,
      chantierId: typeof chantierId === 'string' ? chantierId : '',
    }),
  )
  return Either.isRight(result) ? { deleted: true } : { deleted: false, message: result.left }
}
