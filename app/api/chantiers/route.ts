import { NextRequest, NextResponse } from 'next/server'
import { AdoptChantier, adoptChantierUseCase } from '../../../domain/use-cases/adopt-chantier'
import { runLive } from '../../../infra/live-services'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { adminActorOf } from '../admin-contributor'
import { objectWithFields } from '../json-input'

const FIELDS: ReadonlySet<string> = new Set(['title', 'brief', 'subjects'])

/** The body of an adoption, read defensively: the use case judges the values */
function asAdoption(body: Record<string, unknown>): AdoptChantier {
  return {
    title: typeof body.title === 'string' ? body.title : '',
    brief: typeof body.brief === 'string' ? body.brief : '',
    subjects: Array.isArray(body.subjects)
      ? body.subjects.filter((s): s is string => typeof s === 'string')
      : [],
  }
}

/**
 * Adopts drafts already there into a new chantier: the ones on the named
 * subjects that no chantier holds and no validation settled. The chantier
 * waits, its agent not launched, until a person starts it on the site.
 */
export async function POST(request: NextRequest) {
  const supabase = createAdminSupabaseClient()
  const actor = await adminActorOf(request, supabase)
  if ('response' in actor) return actor.response

  const body = objectWithFields(await request.json(), FIELDS)
  if ('error' in body) return NextResponse.json({ error: body.error }, { status: 400 })

  const result = await runLive(
    adoptChantierUseCase({ contributor: actor.contributor, input: asAdoption(body.input) }),
    supabase,
  )
  if (result._tag === 'Left') return NextResponse.json({ error: result.left }, { status: 400 })

  const { chantier, adopted } = result.right
  return NextResponse.json(
    { id: chantier.id, title: chantier.title, status: chantier.status, adopted },
    { status: 201 },
  )
}
