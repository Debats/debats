import { Effect, Either } from 'effect'
import { DraftAuthor } from '../../domain/entities/draft-statement'
import { DraftStatementRepository } from '../../domain/repositories/draft-statement-repository'
import { runFormCommand } from '../../domain/use-cases/run-command'
import { FieldErrors } from '../../domain/use-cases/types'
import {
  statementContent,
  StatementContentInput,
} from '../../domain/use-cases/validate-statement-fields'
import type { ActionResult } from './validate-draft-action'

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

/** The admin screen shows one message, so the fields at fault are told in one line */
const faultsMessage = (faults: string | FieldErrors): string =>
  typeof faults === 'string' ? faults : Object.values(faults).join(' ')

/**
 * Writes the amendments on the draft, whether it is then validated or kept
 * for later. The content is judged by the domain first; nothing is written
 * when it is refused.
 */
export async function applyAmendments(
  drafts: DraftStatementRepository,
  draftId: string,
  amendments: DraftAmendments,
): Promise<ActionResult> {
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
  if (Object.keys(fields).length === 0) return { success: true }

  const updated = await Effect.runPromise(Effect.either(drafts.update(draftId, fields)))
  if (Either.isLeft(updated)) {
    return { success: false, error: 'Erreur lors de la mise à jour du brouillon.' }
  }
  if (updated.right === null) {
    return { success: false, error: 'Brouillon introuvable.' }
  }
  return { success: true }
}
