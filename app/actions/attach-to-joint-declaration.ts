'use server'

import { Effect, Either } from 'effect'
import { revalidatePath } from 'next/cache'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createPositionRepository } from '../../infra/database/position-repository-supabase'
import { createStatementRepository } from '../../infra/database/statement-repository-supabase'
import { runLiveForm } from '../../infra/live-services'
import { loadAttachmentPlan } from '../../infra/queries/joint-declarations'
import { AttachmentPlan } from '../../domain/read-models/attachment-plan'
import {
  JOINT_DECLARATIONS_HREF,
  jointDeclarationHref,
  STATEMENTS_HREF,
} from '../../domain/read-models/hrefs'
import { attachToJointDeclarationUseCase } from '../../domain/use-cases/attach-to-joint-declaration'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

/*
 * A Server Function receives JSON: its parameters have the types we declare,
 * never the guarantee that they arrive in that shape.
 */
const text = (value: unknown): string => (typeof value === 'string' ? value : '')
const texts = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

/**
 * What attaching this statement to the text that bears this slug will do, or
 * null when the statement or the text is not on the site.
 */
export async function planAttachment(
  statementId: string,
  declarationSlug: string,
): Promise<AttachmentPlan | null> {
  const id = text(statementId)
  const slug = text(declarationSlug).trim()
  if (!id || !slug) return null

  const supabase = createAdminSupabaseClient()
  const statement = await Effect.runPromise(createStatementRepository(supabase).findById(id))
  if (!statement) return null
  // The subject of a statement is its position's to say
  const position = await Effect.runPromise(
    createPositionRepository(supabase).findById(statement.positionId),
  )
  if (!position) return null

  return Effect.runPromise(
    loadAttachmentPlan(supabase, { ...statement, subjectId: position.subjectId }, slug),
  )
}

export type AttachStatementsResult =
  | { success: true; href: string }
  | { success: false; error: string }

/** Says these statements of one author are their signature of the text, and signs the rest of it */
export async function attachStatementsAction(input: {
  declarationId: string
  statementIds: string[]
}): Promise<AttachStatementsResult> {
  const contributor = await getAuthenticatedContributor()
  const result = await runLiveForm(
    attachToJointDeclarationUseCase({
      contributor,
      declarationId: text(input?.declarationId),
      statementIds: texts(input?.statementIds),
    }),
  )
  if (Either.isLeft(result)) {
    const failure = result.left
    return {
      success: false,
      error: typeof failure === 'string' ? failure : Object.values(failure).join(' '),
    }
  }

  const href = jointDeclarationHref(result.right.declaration)
  revalidatePath(href)
  revalidatePath(JOINT_DECLARATIONS_HREF)
  revalidatePath(STATEMENTS_HREF)
  return { success: true, href }
}
