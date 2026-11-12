'use server'

import { Either } from 'effect'
import { revalidatePath } from 'next/cache'
import { ReviewedEntity } from '../../domain/aggregates/review'
import { FLAGS_HREF } from '../../domain/read-models/hrefs'
import { isReviewedEntity } from '../../domain/read-models/review'
import { ENTITY_NOT_FOUND } from '../../domain/use-cases/review-stream'
import { NewSettlement, settleFlagsUseCase } from '../../domain/use-cases/settle-flags'
import { FieldErrors } from '../../domain/use-cases/types'
import { runLiveForm } from '../../infra/live-services'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type SettleFlagsResult =
  | { success: true }
  | { success: false; error: string; fields?: FieldErrors }

/** A moderator closes the open flags of an entity without editing it */
export async function settleFlagsAction(
  entity: ReviewedEntity,
  form: NewSettlement,
): Promise<SettleFlagsResult> {
  if (!isReviewedEntity(entity)) return { success: false, error: ENTITY_NOT_FOUND }
  const contributor = await getAuthenticatedContributor()

  const result = await runLiveForm(settleFlagsUseCase({ contributor, entity, ...form }))

  if (Either.isLeft(result)) {
    return typeof result.left === 'string'
      ? { success: false, error: result.left }
      : { success: false, error: '', fields: result.left }
  }

  revalidatePath(FLAGS_HREF)
  return { success: true }
}
