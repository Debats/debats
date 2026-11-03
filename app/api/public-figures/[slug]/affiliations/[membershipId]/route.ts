import { Effect } from 'effect'
import { NextRequest, NextResponse } from 'next/server'
import { removeOrganisationMembershipUseCase } from '../../../../../../domain/use-cases/remove-organisation-membership'
import { createOrganisationMembershipRepository } from '../../../../../../infra/database/organisation-membership-repository-supabase'
import { createAdminSupabaseClient } from '../../../../../../infra/supabase/admin'
import { adminActorOf } from '../../../../admin-contributor'
import { runForApi } from '../../../../command-outcome'
import { figureBySlug, figureView } from '../../figure'

/**
 * Removes a wrong affiliation of a public figure. An affiliation that ended
 * is not removed: it gets its end date. The id is the one GET /api/public-figures/<slug> shows.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; membershipId: string }> },
) {
  const supabase = createAdminSupabaseClient()
  const actor = await adminActorOf(request, supabase)
  if ('response' in actor) return actor.response

  const { slug, membershipId } = await params
  const found = await figureBySlug(supabase, slug)
  if ('response' in found) return found.response

  const membership = await Effect.runPromise(
    Effect.either(createOrganisationMembershipRepository(supabase).findById(membershipId)),
  )
  if (membership._tag === 'Left') {
    return NextResponse.json({ error: 'Failed to load affiliation' }, { status: 500 })
  }
  if (membership.right === null || membership.right.publicFigureId !== found.figure.id) {
    return NextResponse.json({ error: 'Affiliation not found' }, { status: 404 })
  }

  const outcome = await runForApi(
    removeOrganisationMembershipUseCase({ contributor: actor.contributor, membershipId }),
  )
  if ('response' in outcome) return outcome.response

  const read = await figureView(supabase, found.figure)
  if ('response' in read) return read.response
  return NextResponse.json(read.view)
}
