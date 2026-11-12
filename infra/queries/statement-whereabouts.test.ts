import { describe, it, expect, beforeAll } from 'vitest'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../supabase/admin'
import { statementWhereabouts } from './statement-whereabouts'

/** Runs against the local database (`npm run test:db`), on the rows it holds */
const hasDatabase = Boolean(process.env.DATABASE_URL)

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000'

describe.skipIf(!hasDatabase)('statementWhereabouts', () => {
  // Built once the suite runs: without a database, the environment has no Supabase either
  let supabase: ReturnType<typeof createAdminSupabaseClient>

  beforeAll(() => {
    supabase = createAdminSupabaseClient()
  })

  /** A statement of the local database by an author of this kind, with its author's and its subject's slugs */
  const anyStatementBy = async (author: 'public_figures' | 'organisations') => {
    const { data } = await supabase
      .from('statements')
      .select(`id, ${author}!inner (slug), positions!inner (subjects!inner (slug))`)
      .is('deleted_at', null)
      .limit(1)
      .single()
    if (!data) throw new Error(`No statement by ${author} in the local database`)
    const row = data as unknown as Record<string, { slug: string }> & {
      id: string
      positions: { subjects: { slug: string } }
    }
    return { id: row.id, authorSlug: row[author].slug, subjectSlug: row.positions.subjects.slug }
  }

  it('says which public figure made a statement, and on which subject', async () => {
    const { id, authorSlug, subjectSlug } = await anyStatementBy('public_figures')

    const found = await Effect.runPromise(statementWhereabouts(supabase, [id]))

    expect(found.get(id)).toEqual({
      author: { kind: 'public_figure', slug: authorSlug },
      subjectSlug,
    })
  })

  it('says which organisation made a statement, and on which subject', async () => {
    const { id, authorSlug, subjectSlug } = await anyStatementBy('organisations')

    const found = await Effect.runPromise(statementWhereabouts(supabase, [id]))

    expect(found.get(id)).toEqual({
      author: { kind: 'organisation', slug: authorSlug },
      subjectSlug,
    })
  })

  it('knows nothing of a statement that is not there', async () => {
    const found = await Effect.runPromise(statementWhereabouts(supabase, [UNKNOWN_ID]))

    expect(found.has(UNKNOWN_ID)).toBe(false)
  })

  it('asks nothing for no statement', async () => {
    const found = await Effect.runPromise(statementWhereabouts(supabase, []))

    expect(found.size).toBe(0)
  })
})
