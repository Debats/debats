import { Effect } from 'effect'
import { NextRequest, NextResponse } from 'next/server'
import { assignmentsFromNames } from '../../../../../domain/read-models/occupations'
import { setPublicFigureOccupationsUseCase } from '../../../../../domain/use-cases/set-public-figure-occupations'
import { createOccupationRepository } from '../../../../../infra/database/occupation-repository-supabase'
import { createAdminSupabaseClient } from '../../../../../infra/supabase/admin'
import { adminActorOf } from '../../../admin-contributor'
import { runForApi } from '../../../command-outcome'
import { parseDraftOccupations } from '../../../drafts/validation'
import { objectWithFields } from '../../../json-input'
import { figureBySlug, figureView } from '../figure'

const FIELDS: ReadonlySet<string> = new Set(['occupations'])

/**
 * Sets the occupations a public figure holds, the whole list at once as the
 * selector of `/p/<slug>/modifier` does: what is not sent is no longer held.
 * Names are matched against the closed list; a name outside it refuses the
 * whole call. Body: `{ "occupations": ["Député·e", { "name": "Ministre", "current": false }] }`.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const supabase = createAdminSupabaseClient()
  const actor = await adminActorOf(request, supabase)
  if ('response' in actor) return actor.response

  const body = objectWithFields(await request.json(), FIELDS)
  if ('error' in body) return NextResponse.json({ error: body.error }, { status: 400 })
  if (!('occupations' in body.input)) {
    return NextResponse.json({ error: 'Field occupations is required' }, { status: 400 })
  }
  const parsed = parseDraftOccupations(body.input.occupations)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { slug } = await params
  const found = await figureBySlug(supabase, slug)
  if ('response' in found) return found.response

  const listed = await Effect.runPromise(
    Effect.either(createOccupationRepository(supabase).findAll()),
  )
  if (listed._tag === 'Left') {
    return NextResponse.json({ error: 'Failed to load occupations' }, { status: 500 })
  }
  const resolved = assignmentsFromNames(listed.right, parsed.occupations)
  if ('unknown' in resolved) {
    return NextResponse.json(
      {
        error: `Unknown occupation « ${resolved.unknown} »: pick a name from the closed list (GET /api/catalog)`,
        validOccupations: listed.right.map((occupation) => occupation.name),
      },
      { status: 400 },
    )
  }

  const outcome = await runForApi(
    setPublicFigureOccupationsUseCase({
      contributor: actor.contributor,
      publicFigureId: found.figure.id,
      assignments: resolved.assignments,
    }),
  )
  if ('response' in outcome) return outcome.response

  const read = await figureView(supabase, found.figure)
  if ('response' in read) return read.response
  return NextResponse.json(read.view)
}
