import { Effect } from 'effect'
import { NextRequest, NextResponse } from 'next/server'
import { parseNotedSources } from '../../../../../domain/services/chantier-sources'
import { createChantierRepository } from '../../../../../infra/database/chantier-repository-supabase'
import { createAdminSupabaseClient } from '../../../../../infra/supabase/admin'
import { checkAdminApiKey } from '../../../admin-auth'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Context = { params: Promise<{ id: string }> }

/** The repository of the chantier the request names, or the answer that says why there is none */
async function chantierNamed(request: NextRequest, { params }: Context) {
  if (!checkAdminApiKey(request)) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const { id } = await params
  if (!UUID.test(id)) {
    return { response: NextResponse.json({ error: 'Invalid chantier id' }, { status: 400 }) }
  }
  const chantiers = createChantierRepository(createAdminSupabaseClient())
  const found = await Effect.runPromise(Effect.either(chantiers.findById(id)))
  if (found._tag === 'Left') {
    return { response: NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  }
  if (found.right === null) {
    return { response: NextResponse.json({ error: 'Chantier not found' }, { status: 404 }) }
  }
  return { id, chantiers }
}

/** The notebook of a chantier: what its agent reads back before searching anew */
export async function GET(request: NextRequest, context: Context) {
  const named = await chantierNamed(request, context)
  if ('response' in named) return named.response

  const sources = await Effect.runPromise(Effect.either(named.chantiers.findSources(named.id)))
  if (sources._tag === 'Left') {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
  return NextResponse.json({ sources: sources.right })
}

/**
 * The agent notes the pages it found worth keeping, a few at a time. An
 * address already noted takes its new note. The answer says how many the
 * notebook now holds, not the notebook itself: the agent asks for it when
 * it needs it.
 */
export async function POST(request: NextRequest, context: Context) {
  const named = await chantierNamed(request, context)
  if ('response' in named) return named.response

  const body: unknown = await request.json().catch(() => null)
  const parsed = parseNotedSources(body)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const held = await Effect.runPromise(
    Effect.either(
      Effect.flatMap(named.chantiers.noteSources(named.id, parsed.sources), () =>
        named.chantiers.findSources(named.id),
      ),
    ),
  )
  if (held._tag === 'Left') {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
  return NextResponse.json({ noted: parsed.sources.length, held: held.right.length })
}
