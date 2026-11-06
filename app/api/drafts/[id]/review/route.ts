import { NextRequest, NextResponse } from 'next/server'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../../../infra/supabase/admin'
import { createDraftStatementRepository } from '../../../../../infra/database/draft-statement-repository-supabase'
import { parseDraftReview } from '../../validation'
import { checkAdminApiKey } from '../../../admin-auth'

/**
 * A machine's review of a draft: it may only send it back for revision, with
 * the note that tells the contributor what to fix. Validating and rejecting
 * stay on the review screen, in human hands.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const review = parseDraftReview(await request.json())
  if ('error' in review) {
    return NextResponse.json({ error: review.error }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient()
  const draftRepo = createDraftStatementRepository(supabase)

  const found = await Effect.runPromise(Effect.either(draftRepo.findById(id)))
  if (found._tag === 'Left') {
    return NextResponse.json({ error: 'Failed to fetch draft' }, { status: 500 })
  }
  if (found.right === null) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }

  const result = await Effect.runPromise(
    Effect.either(draftRepo.updateStatus(id, review.status, review.note)),
  )
  if (result._tag === 'Left') {
    return NextResponse.json({ error: 'Failed to review draft' }, { status: 500 })
  }

  return NextResponse.json({ id, status: review.status })
}
