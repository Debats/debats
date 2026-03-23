import { NextRequest, NextResponse } from 'next/server'
import { Effect } from 'effect'
import { Json } from '../../../types/database.types'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createDraftStatementRepository } from '../../../infra/database/draft-statement-repository-supabase'
import { checkAdminApiKey } from './auth'

export async function GET(request: NextRequest) {
  if (!checkAdminApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = request.nextUrl.searchParams.get('status') ?? 'pending'
  if (status !== 'pending' && status !== 'rejected') {
    return NextResponse.json(
      { error: 'Invalid status. Use "pending" or "rejected".' },
      { status: 400 },
    )
  }

  const supabase = createAdminSupabaseClient()
  const draftRepo = createDraftStatementRepository(supabase)

  const result = await Effect.runPromise(
    Effect.either(
      status === 'pending' ? draftRepo.findAllPending() : draftRepo.findAllRejected(),
    ),
  )

  if (result._tag === 'Left') {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json(result.right)
}

const REQUIRED_FIELDS = [
  'publicFigureName',
  'subjectTitle',
  'positionTitle',
  'sourceName',
  'sourceUrl',
  'quote',
  'date',
] as const

function validateDraftInput(
  draft: Record<string, unknown>,
): string | null {
  for (const field of REQUIRED_FIELDS) {
    if (typeof draft[field] !== 'string' || !draft[field]) {
      return `Missing or empty required field: ${field}`
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date as string)) {
    return 'Invalid date format (expected YYYY-MM-DD)'
  }
  return null
}

export async function POST(request: NextRequest) {
  if (!checkAdminApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const drafts = Array.isArray(body) ? body : [body]

  if (drafts.length === 0) {
    return NextResponse.json({ error: 'Expected at least one draft.' }, { status: 400 })
  }

  for (let i = 0; i < drafts.length; i++) {
    const validationError = validateDraftInput(drafts[i])
    if (validationError) {
      return NextResponse.json({ error: `Draft ${i}: ${validationError}` }, { status: 400 })
    }
  }

  const supabase = createAdminSupabaseClient()

  const rows = drafts.map((d: Record<string, unknown>) => ({
    public_figure_name: d.publicFigureName as string,
    subject_title: d.subjectTitle as string,
    position_title: d.positionTitle as string,
    source_name: d.sourceName as string,
    source_url: d.sourceUrl as string,
    quote: d.quote as string,
    date: d.date as string,
    ai_notes: (d.aiNotes as string) ?? null,
    public_figure_data: (d.publicFigureData as Json) ?? null,
    subject_data: (d.subjectData as Json) ?? null,
    position_data: (d.positionData as Json) ?? null,
  }))

  const { data, error } = await supabase.from('draft_statements').insert(rows).select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ created: data.length, ids: data.map((r) => r.id) }, { status: 201 })
}
