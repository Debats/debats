/**
 * Backfill slugs for existing positions using the domain's generateSlug.
 *
 * Usage:
 *   direnv exec . npx tsx scripts/backfill-position-slugs.ts
 */

import { createClient } from '@supabase/supabase-js'
import { slugify } from '../domain/value-objects/slug'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY')
    process.exit(1)
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: positions, error } = await supabase
    .from('positions')
    .select('id, title, subject_id, slug')
    .is('slug', null)

  if (error) {
    console.error('Failed to fetch positions:', error.message)
    process.exit(1)
  }

  if (positions.length === 0) {
    console.log('✓ All positions already have slugs')
    return
  }

  console.log(`${positions.length} positions to backfill`)

  // Track slugs per subject to handle duplicates
  const slugsBySubject = new Map<string, Set<string>>()

  for (const pos of positions) {
    let slug = slugify(pos.title)
    const subjectSlugs = slugsBySubject.get(pos.subject_id) ?? new Set<string>()

    // Handle duplicates within same subject by appending a suffix
    let finalSlug = slug
    let suffix = 2
    while (subjectSlugs.has(finalSlug)) {
      finalSlug = `${slug}-${suffix}`
      suffix++
    }
    subjectSlugs.add(finalSlug)
    slugsBySubject.set(pos.subject_id, subjectSlugs)

    const { error: updateError } = await supabase
      .from('positions')
      .update({ slug: finalSlug })
      .eq('id', pos.id)

    if (updateError) {
      console.error(`✗ ${pos.title}: ${updateError.message}`)
    } else {
      console.log(`✓ ${pos.title} → ${finalSlug}`)
    }
  }
}

main()
