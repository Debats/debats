import { describe, it, expect, beforeAll } from 'vitest'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../supabase/admin'
import { positionHref } from '../../domain/read-models/hrefs'
import { searchHitHref } from '../../domain/read-models/search'
import { searchSite } from './search-site'

/**
 * Runs against the local database (`npm run test:db`), on the rows it holds:
 * the first subject found is searched for under a mangled spelling.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

/** Without accents, in lower case, as a hurried typist would */
const mangled = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

describe.skipIf(!hasDatabase)('search_site', () => {
  // Built once the suite runs: without a database, the environment has no Supabase either
  let supabase: ReturnType<typeof createAdminSupabaseClient>
  let subject: { id: string; title: string } | null = null

  beforeAll(async () => {
    supabase = createAdminSupabaseClient()
    const { data } = await supabase
      .from('subjects')
      .select('id, title')
      .is('deleted_at', null)
      .order('title')
      .limit(1)
      .single()
    subject = data
    // The whole suite runs in parallel: the REST API may answer late the first time
  }, 30_000)

  it('finds a subject under its title typed without accents nor capitals', async () => {
    if (!subject) throw new Error('No subject in the local database')
    const hits = await Effect.runPromise(searchSite(supabase, mangled(subject.title), 5))

    expect(hits.find((hit) => hit.kind === 'subject')?.id).toBe(subject.id)
    expect(hits[0]).toMatchObject({ kind: 'subject', id: subject.id })
  })

  it('gives a position the address its page answers to: its own slug under its subject’s', async () => {
    const { data: position } = await supabase
      .from('positions')
      .select('title')
      .is('deleted_at', null)
      .order('title')
      .limit(1)
      .single()
    if (!position) throw new Error('No position in the local database')

    const hits = await Effect.runPromise(searchSite(supabase, mangled(position.title), 5))
    const found = hits.find((hit) => hit.kind === 'position')
    if (!found) throw new Error('The position was not found under its own title')
    const { data: row } = await supabase
      .from('positions')
      .select('slug, subjects!inner(slug)')
      .eq('id', found.id)
      .single()
    if (!row) throw new Error(`The position ${found.id} is not in the table`)
    const subjectSlug = (row.subjects as unknown as { slug: string }).slug

    expect(found).toMatchObject({ slug: row.slug, subjectSlug })
    expect(searchHitHref(found)).toBe(positionHref(subjectSlug, row.slug))
  })

  it('keeps at most the asked number of hits per kind', async () => {
    const hits = await Effect.runPromise(searchSite(supabase, 'le', 2))
    const perKind = new Map<string, number>()
    for (const hit of hits) perKind.set(hit.kind, (perKind.get(hit.kind) ?? 0) + 1)

    expect(Math.max(...Array.from(perKind.values()))).toBeLessThanOrEqual(2)
  })

  it('finds nothing for a word the site does not know', async () => {
    const hits = await Effect.runPromise(searchSite(supabase, 'xqzvwk', 5))

    expect(hits).toEqual([])
  })
})
