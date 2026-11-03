import { Effect } from 'effect'
import { NextRequest, NextResponse } from 'next/server'
import { addOrganisationMembershipUseCase } from '../../../../../domain/use-cases/add-organisation-membership'
import { createOrganisationRepository } from '../../../../../infra/database/organisation-repository-supabase'
import { createAdminSupabaseClient } from '../../../../../infra/supabase/admin'
import { adminActorOf } from '../../../admin-contributor'
import { runForApi } from '../../../command-outcome'
import { parseAffiliationInput } from '../../validation'
import { figureBySlug, figureView } from '../figure'

/**
 * Affiliates a public figure to an organisation of the catalogue, one at a
 * time as the form of `/p/<slug>/affilier` does. The organisation must exist:
 * create it first with POST /api/organisations. Body: `{ "organisation": "<slug>",
 * "role"?: "…", "startedOn"?: "YYYY-MM-DD", "endedOn"?: "YYYY-MM-DD" }`.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const supabase = createAdminSupabaseClient()
  const actor = await adminActorOf(request, supabase)
  if ('response' in actor) return actor.response

  const parsed = parseAffiliationInput(await request.json())
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { slug } = await params
  const found = await figureBySlug(supabase, slug)
  if ('response' in found) return found.response

  const organisation = await Effect.runPromise(
    Effect.either(
      createOrganisationRepository(supabase).findBySlug(parsed.affiliation.organisation),
    ),
  )
  if (organisation._tag === 'Left') {
    return NextResponse.json({ error: 'Failed to load organisation' }, { status: 500 })
  }
  if (organisation.right === null) {
    return NextResponse.json(
      { error: `Organisation « ${parsed.affiliation.organisation} » not found: create it first` },
      { status: 404 },
    )
  }

  const outcome = await runForApi(
    addOrganisationMembershipUseCase({
      contributor: actor.contributor,
      organisationId: organisation.right.id,
      publicFigureId: found.figure.id,
      role: parsed.affiliation.role,
      startedOn: parsed.affiliation.startedOn,
      endedOn: parsed.affiliation.endedOn,
    }),
  )
  if ('response' in outcome) return outcome.response

  const read = await figureView(supabase, found.figure)
  if ('response' in read) return read.response
  return NextResponse.json(read.view, { status: 201 })
}
