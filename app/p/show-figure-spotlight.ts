'use server'

import { Effect } from 'effect'
import { FigureSpotlight } from '../../domain/read-models/figure-spotlight'
import { loadFigureSpotlight } from '../../infra/queries/figure-index'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'

/** A slug is short and made of what a slug is made of; anything else names nobody */
const SLUG = /^[a-z0-9-]{1,200}$/

/** What the index shows of one figure when the reader asks for another; null when the slug names nobody */
export async function showFigureSpotlight(slug: string): Promise<FigureSpotlight | null> {
  if (typeof slug !== 'string' || !SLUG.test(slug)) return null
  return Effect.runPromise(loadFigureSpotlight(createAdminSupabaseClient(), slug, new Date()))
}
