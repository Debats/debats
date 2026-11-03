import { Effect, Option } from 'effect'
import { NextRequest, NextResponse } from 'next/server'
import { organisationStream } from '../../../../domain/aggregates/organisation'
import { Organisation } from '../../../../domain/entities/organisation'
import { updateOrganisationUseCase } from '../../../../domain/use-cases/update-organisation'
import { createOrganisationRepository } from '../../../../infra/database/organisation-repository-supabase'
import { currentRevision } from '../../../../infra/events/stream-revision'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { adminActorOf } from '../../admin-contributor'
import { runForApi } from '../../command-outcome'
import { OrganisationInput, parseOrganisationPatch } from '../validation'

/** The organisation's fields as the edit form would show them, to patch over */
const fieldsOf = (organisation: Organisation): OrganisationInput => ({
  name: organisation.name,
  acronym: Option.getOrElse(organisation.acronym, () => ''),
  organisationType: organisation.organisationType,
  presentation: organisation.presentation,
  wikipediaUrl: Option.getOrElse(organisation.wikipediaUrl, () => ''),
  websiteUrl: Option.getOrElse(organisation.websiteUrl, () => ''),
  notorietySources: [...organisation.notorietySources],
})

/**
 * Corrects an organisation, field by field, as the form of `/o/<slug>/modifier`
 * does with the whole form: the fields not sent keep their value.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const supabase = createAdminSupabaseClient()
  const actor = await adminActorOf(request, supabase)
  if ('response' in actor) return actor.response

  const patch = parseOrganisationPatch(await request.json())
  if ('error' in patch) return NextResponse.json({ error: patch.error }, { status: 400 })

  const { slug } = await params
  const found = await Effect.runPromise(
    Effect.either(createOrganisationRepository(supabase).findBySlug(slug)),
  )
  if (found._tag === 'Left') {
    return NextResponse.json({ error: 'Failed to load organisation' }, { status: 500 })
  }
  if (found.right === null) {
    return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
  }
  const existing = found.right

  const outcome = await runForApi(
    updateOrganisationUseCase({
      contributor: actor.contributor,
      organisationId: existing.id,
      ...fieldsOf(existing),
      ...patch.fields,
      revision: await currentRevision(organisationStream(existing.id)),
    }),
  )
  if ('response' in outcome) return outcome.response

  const { id, slug: newSlug, name } = outcome.value
  return NextResponse.json({ id, slug: newSlug, name })
}
