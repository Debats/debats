import { NextRequest, NextResponse } from 'next/server'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createDraftStatementRepository } from '../../../infra/database/draft-statement-repository-supabase'
import { NewDraftStatement } from '../../../domain/repositories/draft-statement-repository'
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

/** Parses one posted draft, or says why it is refused. */
function parseDraftInput(
  input: Record<string, unknown>,
): { draft: NewDraftStatement } | { error: string } {
  for (const field of REQUIRED_FIELDS) {
    if (typeof input[field] !== 'string' || !input[field]) {
      return { error: `Missing or empty required field: ${field}` }
    }
  }
  const slugError = validateSlugifiableFields(input, false)
  if (slugError) return { error: slugError }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date as string)) {
    return { error: 'Invalid date format (expected YYYY-MM-DD)' }
  }

  const parsedAuthor = parseDraftAuthor(input.author)
  if ('error' in parsedAuthor) return parsedAuthor

  if (input.statementType !== undefined && !isStatementType(input.statementType)) {
    return { error: `Field statementType must be one of: ${STATEMENT_TYPES.join(', ')}` }
  }

  return {
    draft: {
      author: parsedAuthor.author,
      statementType: (input.statementType as StatementType) ?? 'declaration',
      subjectTitle: input.subjectTitle as string,
      positionTitle: input.positionTitle as string,
      sourceName: input.sourceName as string,
      sourceUrl: input.sourceUrl as string,
      quote: input.quote as string,
      date: input.date as string,
      aiNotes: (input.aiNotes as string) ?? null,
      subjectData: (input.subjectData as NewDraftStatement['subjectData']) ?? null,
      positionData: (input.positionData as NewDraftStatement['positionData']) ?? null,
      origin: input.origin as string,
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

  const parsed: NewDraftStatement[] = []
  for (let index = 0; index < drafts.length; index++) {
    const result = parseDraftInput(drafts[index])
    if ('error' in result) {
      return NextResponse.json({ error: `Draft ${index}: ${result.error}` }, { status: 400 })
    }
    parsed.push(result.draft)
  }

  const draftRepo = createDraftStatementRepository(createAdminSupabaseClient())
  const result = await Effect.runPromise(Effect.either(draftRepo.createMany(parsed)))

  if (result._tag === 'Left') {
    return NextResponse.json({ error: result.left.message }, { status: 500 })
  }

  return NextResponse.json({ created: result.right.length, ids: result.right }, { status: 201 })
}
