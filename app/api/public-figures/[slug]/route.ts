import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { checkAdminApiKey } from '../../admin-auth'
import { figureBySlug, figureView } from './figure'

/** A public figure's occupations and affiliations, to read before writing them. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!checkAdminApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createAdminSupabaseClient()
  const { slug } = await params

  const found = await figureBySlug(supabase, slug)
  if ('response' in found) return found.response
  const read = await figureView(supabase, found.figure)
  if ('response' in read) return read.response

  return NextResponse.json(read.view)
}
