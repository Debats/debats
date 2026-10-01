import { NextRequest, NextResponse } from 'next/server'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { createDraftStatementRepository } from '../../../../infra/database/draft-statement-repository-supabase'
import { parseDraftAuthor, validateSlugifiableFields } from '../validation'
import { checkAdminApiKey } from '../../admin-auth'

const ALLOWED_FIELDS = new Set([
  'quote',
  'sourceName',
  'sourceUrl',
  'date',
  'aiNotes',
  'author',
  'statementType',
  'subjectTitle',
  'positionTitle',
  'subjectData',
  'positionData',
  'rejectionNote',
  'origin',
])

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!checkAdminApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Expected a JSON object.' }, { status: 400 })
  }

  const unknownFields = Object.keys(body).filter((k) => !ALLOWED_FIELDS.has(k))
  if (unknownFields.length > 0) {
    return NextResponse.json(
      { error: `Unknown fields: ${unknownFields.join(', ')}` },
      { status: 400 },
    )
  }

  if (Object.keys(body).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
  }

  const slugError = validateSlugifiableFields(body, true)
  if (slugError) {
    return NextResponse.json({ error: slugError }, { status: 400 })
  }

  const fields = { ...body }
  if ('author' in fields) {
    const parsedAuthor = parseDraftAuthor(fields.author)
    if ('error' in parsedAuthor) {
      return NextResponse.json({ error: parsedAuthor.error }, { status: 400 })
    }
    fields.author = parsedAuthor.author
  }

  const supabase = createAdminSupabaseClient()
  const draftRepo = createDraftStatementRepository(supabase)

  const result = await Effect.runPromise(Effect.either(draftRepo.update(id, fields)))

  if (result._tag === 'Left') {
    return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 })
  }

  if (result.right === null) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }

  return NextResponse.json(result.right)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!checkAdminApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = createAdminSupabaseClient()
  const draftRepo = createDraftStatementRepository(supabase)

  const result = await Effect.runPromise(Effect.either(draftRepo.deleteById(id)))

  if (result._tag === 'Left') {
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 })
  }

  return NextResponse.json({ deleted: true })
}
