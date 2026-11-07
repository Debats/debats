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
   * Une Server Function reçoit du JSON : son paramètre a le type qu'on déclare,
   * jamais la garantie qu'il arrive sous cette forme. Les champs jugés par un
   * schéma se défendent seuls, et les identifiants échouent proprement sur la
   * lecture qui ne les trouve pas ; les deux tableaux d'arguments, que le
   * domaine parcourt sans les interroger, se ramènent ici à leur forme.
   */
  const result = await runLiveForm(
    createStatementUseCase({
      ...input,
      contributor,
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
   * L'auteur dont on donne le lien est celui que la commande a écrit, pas celui
   * qu'on lui a envoyé : il vient peut-être d'être ouvert par ce même geste.
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
