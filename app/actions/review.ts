'use server'

import { Effect, Either } from 'effect'
import { ReviewedEntity } from '../../domain/aggregates/review'
import { isReviewedEntity, markOf, ReviewDetail, ReviewMark } from '../../domain/read-models/review'
import {
  confirmEntityUseCase,
  withdrawConfirmationUseCase,
} from '../../domain/use-cases/confirm-entity'
import { flagEntityUseCase, NewFlag, withdrawFlagUseCase } from '../../domain/use-cases/flag-entity'
import { ENTITY_NOT_FOUND } from '../../domain/use-cases/review-stream'
import { FieldErrors } from '../../domain/use-cases/types'
import { runLive, runLiveForm } from '../../infra/live-services'
import { loadReviewDetail, loadReviewMarks } from '../../infra/queries/review'
import { createSSRSupabaseClient } from '../../infra/supabase/ssr'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

/** What a reader's word leaves: the mark as it now stands, or why it was refused */
export type ReviewResult =
  | { success: true; mark: ReviewMark }
  | { success: false; error: string; fields?: FieldErrors }

type Contributor = Awaited<ReturnType<typeof getAuthenticatedContributor>>

const refusedAs = (failure: string | FieldErrors): ReviewResult =>
  typeof failure === 'string'
    ? { success: false, error: failure }
    : { success: false, error: '', fields: failure }

/** The mark of the entity as the viewer now sees it, read after her command wrote */
async function markFor(entity: ReviewedEntity, viewerId: string): Promise<ReviewMark> {
  const supabase = await createSSRSupabaseClient()
  const marks = await Effect.runPromise(loadReviewMarks(supabase, [entity.id], viewerId))
  return markOf(marks, entity.id)
}

/**
 * Runs a reader's command on the entity a page named, and answers with the
 * mark it leaves. What arrives here has no type: an entity that is not one
 * is refused before anything runs.
 */
async function reviewed(
  entity: unknown,
  command: (
    contributor: Contributor,
    entity: ReviewedEntity,
  ) => Promise<Either.Either<void, string | FieldErrors>>,
): Promise<ReviewResult> {
  if (!isReviewedEntity(entity)) return { success: false, error: ENTITY_NOT_FOUND }
  const contributor = await getAuthenticatedContributor()
  const result = await command(contributor, entity)
  if (Either.isLeft(result)) return refusedAs(result.left)
  // A command that passed was signed in: the mark is read as hers
  return { success: true, mark: await markFor(entity, contributor!.id) }
}

export async function confirmEntityAction(entity: ReviewedEntity): Promise<ReviewResult> {
  return reviewed(entity, (contributor, named) =>
    runLive(confirmEntityUseCase({ contributor, entity: named })),
  )
}

export async function withdrawConfirmationAction(entity: ReviewedEntity): Promise<ReviewResult> {
  return reviewed(entity, (contributor, named) =>
    runLive(withdrawConfirmationUseCase({ contributor, entity: named })),
  )
}

export async function flagEntityAction(
  entity: ReviewedEntity,
  flag: NewFlag,
): Promise<ReviewResult> {
  return reviewed(entity, (contributor, named) =>
    runLiveForm(flagEntityUseCase({ contributor, entity: named, ...flag })),
  )
}

export async function withdrawFlagAction(entity: ReviewedEntity): Promise<ReviewResult> {
  return reviewed(entity, (contributor, named) =>
    runLive(withdrawFlagUseCase({ contributor, entity: named })),
  )
}

/** What the mark opens on, read when a viewer asks for it; null for an entity that is not one */
export async function reviewDetailAction(entity: ReviewedEntity): Promise<ReviewDetail | null> {
  if (!isReviewedEntity(entity)) return null
  const supabase = await createSSRSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return Effect.runPromise(loadReviewDetail(supabase, entity, user?.id ?? null))
}
