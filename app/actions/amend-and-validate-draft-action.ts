'use server'

import { Effect, Either } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createDraftStatementRepository } from '../../infra/database/draft-statement-repository-supabase'
import { runLive } from '../../infra/live-services'
import { validateDraft } from '../../domain/use-cases/validate-draft'
import { DraftAuthor } from '../../domain/entities/draft-statement'
import { FieldErrors } from '../../domain/use-cases/types'
import { runFormCommand } from '../../domain/use-cases/run-command'
import {
  statementContent,
  StatementContentInput,
} from '../../domain/use-cases/validate-statement-fields'
import { getAdminContributor } from './admin-guard'
import type { ActionResult } from './validate-draft-action'

/** The admin screen shows one message, so the fields at fault are told in one line */
const faultsMessage = (faults: string | FieldErrors): string =>
  typeof faults === 'string' ? faults : Object.values(faults).join(' ')

export type DraftAmendments = {
  author?: DraftAuthor
  subjectTitle?: string
  positionTitle?: string
  sourceName?: string
  /**
   * What the draft carries, as the form holds it. It stays flat up to here:
   * only the domain reads it according to its type, and says which field is
   * at fault when the type and the fields disagree.
   */
  content?: StatementContentInput
  subjectData?: { presentation: string; problem: string } | null
  positionData?: { description: string } | null
}

export async function amendAndValidateDraftAction(
  draftId: string,
  amendments: DraftAmendments,
): Promise<ActionResult> {
  const contributor = await getAdminContributor()
  if (!contributor) {
    return { success: false, error: 'Accès refusé.' }
  }

  const supabase = createAdminSupabaseClient()
  const draftRepo = createDraftStatementRepository(supabase)

  const { content: amendedContent, ...rest } = amendments
  const content = amendedContent
    ? await runFormCommand(statementContent(amendedContent))
    : Either.right(undefined)
  if (Either.isLeft(content)) {
    return { success: false, error: faultsMessage(content.left) }
  }

  const fields = Object.fromEntries(
    Object.entries({ ...rest, content: content.right }).filter(([, v]) => v !== undefined),
  )

  if (Object.keys(fields).length > 0) {
    const updateResult = await Effect.runPromise(Effect.either(draftRepo.update(draftId, fields)))
    if (updateResult._tag === 'Left') {
      return { success: false, error: 'Erreur lors de la mise à jour du brouillon.' }
    }
    if (updateResult.right === null) {
      return { success: false, error: 'Brouillon introuvable.' }
    }
  }

  const result = await runLive(validateDraft({ draftId, contributor }), supabase)

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true }
}
