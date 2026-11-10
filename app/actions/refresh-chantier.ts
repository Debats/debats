'use server'

import { Either } from 'effect'
import { RefreshedChantier, refreshChantierUseCase } from '../../domain/use-cases/refresh-chantier'
import { runLive } from '../../infra/live-services'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type RefreshChantierResult =
  | ({ refreshed: true } & RefreshedChantier)
  | { refreshed: false; message: string }

/** Brings a chantier up to date with its session: the page polls this while the agent works */
export async function refreshChantierAction(chantierId: unknown): Promise<RefreshChantierResult> {
  const contributor = await getAuthenticatedContributor()
  const result = await runLive(
    refreshChantierUseCase({
      contributor,
      chantierId: typeof chantierId === 'string' ? chantierId : '',
    }),
  )
  return Either.isRight(result)
    ? { refreshed: true, ...result.right }
    : { refreshed: false, message: result.left }
}
