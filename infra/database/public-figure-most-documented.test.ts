import { describe, it, expect } from 'vitest'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../supabase/admin'
import { createPublicFigureRepository } from './public-figure-repository-supabase'

/** Runs against the local database (`npm run test:db`), on the public figures it holds */
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('the most documented public figures', () => {
  it('reads the first of them: by subjects, then by statements, then by name', async () => {
    const figures = await Effect.runPromise(
      createPublicFigureRepository(createAdminSupabaseClient()).findMostDocumented(12),
    )

    expect(figures).toHaveLength(12)
    const ranked = [...figures].sort(
      (a, b) =>
        b.subjectsCount - a.subjectsCount ||
        b.statementsCount - a.statementsCount ||
        a.name.localeCompare(b.name, 'fr'),
    )
    expect(figures.map(({ id }) => id)).toEqual(ranked.map(({ id }) => id))
  })

  it('reads the most documented of all first', async () => {
    const supabase = createAdminSupabaseClient()
    const [first] = await Effect.runPromise(
      createPublicFigureRepository(supabase).findMostDocumented(1),
    )
    const { data, error } = await supabase
      .from('v_public_figure_activity_summary')
      .select('subjects_count')
      .order('subjects_count', { ascending: false })
      .limit(1)
      .single()
    if (error) throw error

    expect(first.subjectsCount).toBe(data.subjects_count)
  })
})
