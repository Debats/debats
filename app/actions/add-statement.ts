'use server'

import { Either, Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { runLiveForm } from '../../infra/live-services'
import { createPublicFigureRepository } from '../../infra/database/public-figure-repository-supabase'
import { createOrganisationRepository } from '../../infra/database/organisation-repository-supabase'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import {
  organisationAuthor,
  publicFigureAuthor,
  StatementAuthor,
} from '../../domain/entities/statement'
import { createStatementUseCase, FieldErrors } from '../../domain/use-cases/create-statement'
import { getAuthenticatedContributor } from './get-authenticated-contributor'
import { readStatementArguments } from './statement-arguments-fields'
import { readStatementContent } from './statement-content-fields'

export type ActionResult =
  | { success: true; subjectSlug: string; authorHref: string; authorLabel: string }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

/** The form names the author kind, then the matching identifier field */
function readAuthor(formData: FormData): StatementAuthor {
  const kind = String(formData.get('authorKind') ?? 'public_figure')
  return kind === 'organisation'
    ? organisationAuthor(String(formData.get('organisationId') ?? ''))
    : publicFigureAuthor(String(formData.get('publicFigureId') ?? ''))
}

export async function addStatementAction(formData: FormData): Promise<ActionResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const subjectId = String(formData.get('subjectId') ?? '')
  const author = readAuthor(formData)

  const result = await runLiveForm(
    createStatementUseCase({
      contributor,
      subjectId,
      author,
      positionId: String(formData.get('positionId') ?? ''),
      content: readStatementContent(formData),
      sourceName: String(formData.get('sourceName') ?? ''),
      sourceUrl: String(formData.get('sourceUrl') ?? ''),
      statedAt: String(formData.get('statedAt') ?? ''),
      arguments: readStatementArguments(formData),
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
