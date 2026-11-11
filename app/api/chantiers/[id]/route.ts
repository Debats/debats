import { Effect } from 'effect'
import { NextRequest, NextResponse } from 'next/server'
import { Chantier } from '../../../../domain/entities/chantier'
import { createChantierRepository } from '../../../../infra/database/chantier-repository-supabase'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { adminActorOf } from '../../admin-contributor'
import { checkAdminApiKey } from '../../admin-auth'
import { SECTION_MAX_LENGTH } from '../../drafts/validation'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SECTIONS_MAX = 40

/** What the agent reads of its chantier: the brief it works, and the sections it declared */
const shown = (chantier: Chantier) => ({
  id: chantier.id,
  brief: chantier.brief,
  title: chantier.title,
  status: chantier.status,
  sections: chantier.sections,
})

/** The ordered section titles the agent wants its drafts read in: short, distinct, not too many */
function parseSections(body: unknown): { sections: string[] } | { error: string } {
  if (typeof body !== 'object' || body === null || !('sections' in body)) {
    return { error: 'Expected { "sections": [ … ] }' }
  }
  const raw = (body as { sections: unknown }).sections
  if (!Array.isArray(raw) || raw.length > SECTIONS_MAX) {
    return { error: `Field sections must be an array of at most ${SECTIONS_MAX} titles` }
  }
  const sections = raw.map((title) => (typeof title === 'string' ? title.trim() : ''))
  if (sections.some((title) => !title || title.length > SECTION_MAX_LENGTH)) {
    return {
      error: `Each section must be a non-empty string of at most ${SECTION_MAX_LENGTH} characters`,
    }
  }
  if (new Set(sections).size !== sections.length) return { error: 'Sections must be distinct' }
  return { sections }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid chantier id' }, { status: 400 })

  const found = await Effect.runPromise(
    Effect.either(createChantierRepository(createAdminSupabaseClient()).findById(id)),
  )
  if (found._tag === 'Left') {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
  if (found.right === null) {
    return NextResponse.json({ error: 'Chantier not found' }, { status: 404 })
  }
  return NextResponse.json(shown(found.right))
}

/**
 * The agent declares the sections of its chantier, in reading order. It is
 * the only field it may change: the brief is the person's, the status the
 * session's.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminSupabaseClient()
  const actor = await adminActorOf(request, supabase)
  if ('response' in actor) return actor.response

  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid chantier id' }, { status: 400 })

  const parsed = parseSections(await request.json())
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const updated = await Effect.runPromise(
    Effect.either(
      createChantierRepository(supabase).update(
        id,
        { sections: parsed.sections },
        actor.contributor.id,
      ),
    ),
  )
  if (updated._tag === 'Left') {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
  if (updated.right === null) {
    return NextResponse.json({ error: 'Chantier not found' }, { status: 404 })
  }
  return NextResponse.json(shown(updated.right))
}
