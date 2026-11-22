import { NextRequest, NextResponse } from 'next/server'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { createDraftStatementRepository } from '../../../../infra/database/draft-statement-repository-supabase'
import { parseDraftPatch, signatureFault } from '../validation'
import { checkAdminApiKey } from '../../admin-auth'

/** A correction of a draft: partial, field by field, and it sends the draft back to pending. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const patch = parseDraftPatch(await request.json())
  if ('error' in patch) {
    return NextResponse.json({ error: patch.error }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient()
  const draftRepo = createDraftStatementRepository(supabase)

  // The draft as the correction leaves it must still be one its validation accepts
  const current = await Effect.runPromise(Effect.either(draftRepo.findById(id)))
  if (current._tag === 'Left') {
    return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 })
  }
  if (current.right === null) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }
  const fault = signatureFault({ ...current.right, ...patch.fields })
  if (fault) {
    return NextResponse.json({ error: fault }, { status: 400 })
  }

  const result = await Effect.runPromise(Effect.either(draftRepo.update(id, patch.fields)))

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
