'use server'

import { Either, Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { runLiveForm } from '../../infra/live-services'
import { createPublicFigureRepository } from '../../infra/database/public-figure-repository-supabase'
import { createOrganisationRepository } from '../../infra/database/organisation-repository-supabase'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import { createPositionRepository } from '../../infra/database/position-repository-supabase'
import {
  createStatementUseCase,
  FieldErrors,
  NewStatement,
} from '../../domain/use-cases/create-statement'
import { statementArgumentsOf } from '../../lib/forms/statement-arguments'
import { statementAuthorOf } from '../../lib/forms/statement-author'
import { statementTopicOf } from '../../lib/forms/statement-topic'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult =
  | { success: true; subjectSlug: string; authorHref: string; authorLabel: string }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function addStatementAction(input: NewStatement): Promise<ActionResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  /*
   * A Server Function receives JSON: its parameter has the type we declare,
   * never the guarantee that it arrives in that shape. Fields judged by a
   * schema defend themselves, and ids fail cleanly on the read that does not
   * find them. What the domain walks through without questioning is brought
   * back to its shape here: the two argument arrays, the author and the
   * topic, whose kinds the command reads and whose payloads it takes as given.
   */
  const result = await runLiveForm(
    createStatementUseCase({
      ...input,
      contributor,
      author: statementAuthorOf(input.author),
      topic: statementTopicOf(input.topic),
      arguments: statementArgumentsOf(input.arguments),
    }),
    supabase,
  )

  if (Either.isLeft(result)) {
    const err = result.left
    if (typeof err === 'string') {
      return { success: false, error: err }
    }
    return { success: false, fieldErrors: err }
  }

  /*
   * The subject and the author we link to are the ones the command wrote, not
   * the ones it was sent: either may have just been created by this very
   * gesture. A statement holds its position, and a position its subject —
   * that is where the subject it ended up on is to be read.
   */
  const position = await Effect.runPromise(
    createPositionRepository(supabase).findById(result.right.positionId),
  )
  const subject = position
    ? await Effect.runPromise(createSubjectRepository(supabase).findById(position.subjectId))
    : null
  const author = result.right.author

  if (author.kind === 'organisation') {
    const organisation = await Effect.runPromise(
      createOrganisationRepository(supabase).findById(author.id),
    )
    return {
      success: true,
      subjectSlug: subject?.slug ?? '',
      authorHref: organisation ? `/o/${organisation.slug}` : '',
      authorLabel: 'Voir l’organisation',
    }
  }

  const figure = await Effect.runPromise(createPublicFigureRepository(supabase).findById(author.id))
  return {
    success: true,
    subjectSlug: subject?.slug ?? '',
    authorHref: figure ? `/p/${figure.slug}` : '',
    authorLabel: 'Voir la personnalité',
  }
}
