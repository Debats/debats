'use server'

import { Either, Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { runLiveForm } from '../../infra/live-services'
import { createPublicFigureRepository } from '../../infra/database/public-figure-repository-supabase'
import { createOrganisationRepository } from '../../infra/database/organisation-repository-supabase'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import {
  createStatementUseCase,
  FieldErrors,
  NewStatement,
} from '../../domain/use-cases/create-statement'
import { statementArgumentsOf } from '../../lib/forms/statement-arguments'
import { statementAuthorOf } from '../../lib/forms/statement-author'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult =
  | { success: true; subjectSlug: string; authorHref: string; authorLabel: string }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function addStatementAction(input: NewStatement): Promise<ActionResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()
  const { subjectId } = input

  /*
   * A Server Function receives JSON: its parameter has the type we declare,
   * never the guarantee that it arrives in that shape. Fields judged by a
   * schema defend themselves, and ids fail cleanly on the read that does not
   * find them. What the domain walks through without questioning is brought
   * back to its shape here: the two argument arrays, and the author, whose
   * kind the command switches on and whose payload it reads as given.
   *
   * The position needs none of it: its `kind` is read by a ternary, so an
   * unexpected one counts as « the one that was ticked » and ends in a
   * refusal on its missing id.
   */
  const result = await runLiveForm(
    createStatementUseCase({
      ...input,
      contributor,
      author: statementAuthorOf(input.author),
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

  const subject = await Effect.runPromise(createSubjectRepository(supabase).findById(subjectId))
  /*
   * The author we link to is the one the command wrote, not the one it was
   * sent: it may have just been created by this very gesture.
   */
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
