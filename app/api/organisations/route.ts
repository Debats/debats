import { NextRequest, NextResponse } from 'next/server'
import { createOrganisationUseCase } from '../../../domain/use-cases/create-organisation'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { adminActorOf } from '../admin-contributor'
import { runForApi } from '../command-outcome'
import { parseOrganisationInput } from './validation'

/**
 * Creates an organisation, with the fields of the form of `/o/ajouter` and
 * the same rules: a type from the list, a presentation, a Wikipedia page
 * about the organisation or two notoriety sources. No logo through the API.
 */
export async function POST(request: NextRequest) {
  const supabase = createAdminSupabaseClient()
  const actor = await adminActorOf(request, supabase)
  if ('response' in actor) return actor.response

  const parsed = parseOrganisationInput(await request.json())
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const outcome = await runForApi(
    createOrganisationUseCase({ contributor: actor.contributor, ...parsed.fields }),
  )
  if ('response' in outcome) return outcome.response

  const { id, slug, name } = outcome.value
  return NextResponse.json({ id, slug, name }, { status: 201 })
}
