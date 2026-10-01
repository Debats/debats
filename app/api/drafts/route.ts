import { NextRequest, NextResponse } from 'next/server'
import { Effect } from 'effect'
import { Json } from '../../../types/database.types'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import {
  authorColumns,
  createDraftStatementRepository,
} from '../../../infra/database/draft-statement-repository-supabase'
import { DraftAuthor } from '../../../domain/entities/draft-statement'
import { STATEMENT_TYPES, StatementType } from '../../../domain/entities/statement'
import { parseDraftAuthor, validateSlugifiableFields } from './validation'
import { checkAdminApiKey } from '../admin-auth'

export async function GET(request: NextRequest) {
  if (!checkAdminApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = request.nextUrl.searchParams.get('status') ?? 'pending'
  const validStatuses = ['pending', 'rejected', 'revision_requested'] as const
  if (!validStatuses.includes(status as (typeof validStatuses)[number])) {
    return NextResponse.json(
      { error: 'Invalid status. Use "pending", "rejected" or "revision_requested".' },
      { status: 400 },
    )
  }

  const supabase = createAdminSupabaseClient()
  const draftRepo = createDraftStatementRepository(supabase)

  const result = await Effect.runPromise(
    Effect.either(draftRepo.findByStatus(status as (typeof validStatuses)[number])),
  )

  if (result._tag === 'Left') {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json(result.right)
}

const REQUIRED_FIELDS = [
  'subjectTitle',
  'positionTitle',
  'sourceName',
  'sourceUrl',
  'quote',
  'date',
  'origin',
] as const

type ValidatedDraft = { author: DraftAuthor; statementType: StatementType }

function validateDraftInput(
  draft: Record<string, unknown>,
): { draft: ValidatedDraft } | { error: string } {
  for (const field of REQUIRED_FIELDS) {
    if (typeof draft[field] !== 'string' || !draft[field]) {
      return { error: `Missing or empty required field: ${field}` }
    }
  }
  const slugError = validateSlugifiableFields(draft, false)
  if (slugError) return { error: slugError }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date as string)) {
    return { error: 'Invalid date format (expected YYYY-MM-DD)' }
  }

  const parsedAuthor = parseDraftAuthor(draft.author)
  if ('error' in parsedAuthor) return parsedAuthor

  if (draft.statementType !== undefined && !isStatementType(draft.statementType)) {
    return {
      error: `Field statementType must be one of: ${STATEMENT_TYPES.join(', ')}`,
    }
  }

  return {
    draft: {
      author: parsedAuthor.author,
      statementType: (draft.statementType as StatementType) ?? 'declaration',
    },
  }
}

function isStatementType(value: unknown): value is StatementType {
  return STATEMENT_TYPES.includes(value as StatementType)
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

  const validated: ValidatedDraft[] = []
  for (let i = 0; i < drafts.length; i++) {
    const result = validateDraftInput(drafts[i])
    if ('error' in result) {
      return NextResponse.json({ error: `Draft ${i}: ${result.error}` }, { status: 400 })
    }
    validated.push(result.draft)
  }

  const supabase = createAdminSupabaseClient()

  const rows = drafts.map((d: Record<string, unknown>, i: number) => ({
    ...authorColumns(validated[i].author),
    statement_type: validated[i].statementType,
    subject_title: d.subjectTitle as string,
    position_title: d.positionTitle as string,
    source_name: d.sourceName as string,
    source_url: d.sourceUrl as string,
    quote: d.quote as string,
    date: d.date as string,
    ai_notes: (d.aiNotes as string) ?? null,
    subject_data: (d.subjectData as Json) ?? null,
    position_data: (d.positionData as Json) ?? null,
    origin: d.origin as string,
  }))

  const { data, error } = await supabase.from('draft_statements').insert(rows).select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ created: data.length, ids: data.map((r) => r.id) }, { status: 201 })
}
