import { NextRequest, NextResponse } from 'next/server'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createContentCatalogRepository } from '../../../infra/database/content-catalog-repository-supabase'
import { checkAdminApiKey } from '../admin-auth'

/**
 * Lists every existing subject, position, public figure and organisation so an
 * automated contributor can reuse them instead of creating near-duplicates.
 */
export async function GET(request: NextRequest) {
  if (!checkAdminApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminSupabaseClient()
  const catalogRepo = createContentCatalogRepository(supabase)

  const result = await Effect.runPromise(Effect.either(catalogRepo.getCatalog()))

  if (result._tag === 'Left') {
    return NextResponse.json({ error: result.left.message }, { status: 500 })
  }

  return NextResponse.json(result.right)
}
