import { describe, it, expect, beforeAll } from 'vitest'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../supabase/admin'
import { positionHref } from '../../domain/read-models/hrefs'
import { searchHitHref } from '../../domain/read-models/search'
import { searchSite } from './search-site'
import { statementWhereabouts } from './statement-whereabouts'

/**
 * Runs against the local database (`npm run test:db`), on the rows it holds:
 * the first subject found is searched for under a mangled spelling.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

/** Without accents, in lower case, as a hurried typist would */
const mangled = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** The plain words of a text, mangled: what one would type to find it */
const wordsOf = (text: string) => mangled(text).match(/[a-z0-9]+/g) ?? []

/** More hits per kind than any kind holds: the test reads all of them */
const EVERY = 5000

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

  it('finds a title under its words in another order', async () => {
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, title')
      .is('deleted_at', null)
    const manyWords = subjects?.find((s) => s.title.trim().split(/\s+/).length >= 3)
    if (!manyWords) throw new Error('No subject with a title of three words')
    const reversed = mangled(manyWords.title).split(/\s+/).reverse().join(' ')

    const hits = await Effect.runPromise(searchSite(supabase, reversed, EVERY))

    expect(hits.filter((hit) => hit.kind === 'subject').map((hit) => hit.id)).toContain(
      manyWords.id,
    )
  })

  it('finds a subject under a word of its problem, after those found by their title, with the excerpt that holds the word', async () => {
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, title, problem')
      .is('deleted_at', null)
    const titles = (subjects ?? []).map((s) => mangled(s.title)).join(' ')
    // A word of a problem that no title of a subject holds: only the long text can answer
    const lead = (subjects ?? []).flatMap((s) => {
      const word = wordsOf(s.problem).find((w) => w.length >= 8 && !titles.includes(w))
      return word ? [{ id: s.id, word }] : []
    })[0]
    if (!lead) throw new Error('No problem holds a word absent from every title')

    const found = (await Effect.runPromise(searchSite(supabase, lead.word, EVERY))).filter(
      (hit) => hit.kind === 'subject',
    )
    const byText = found.find((hit) => hit.id === lead.id)

    expect(mangled(byText?.excerpt ?? '')).toContain(lead.word)
    const excerpts = found.map((hit) => hit.excerpt !== null)
    expect(excerpts).toEqual([...excerpts].sort((a, b) => Number(a) - Number(b)))
  })

  it('finds an occupation, on the page of its family, and the public figures who hold it', async () => {
    const { data: held } = await supabase
      .from('public_figure_occupations')
      .select(
        'public_figure_id, occupations!inner(name, occupation_families!inner(slug)), public_figures!inner(name, deleted_at)',
      )
      .is('public_figures.deleted_at', null)
      .limit(1)
      .single()
    if (!held) throw new Error('No public figure holds an occupation in the local database')
    const occupation = held.occupations as unknown as {
      name: string
      occupation_families: { slug: string }
    }

    const hits = await Effect.runPromise(searchSite(supabase, mangled(occupation.name), EVERY))

    expect(
      hits.find((hit) => hit.kind === 'occupation' && hit.title === occupation.name),
    ).toMatchObject({ slug: occupation.occupation_families.slug })
    const figure = hits.find(
      (hit) => hit.kind === 'public_figure' && hit.id === held.public_figure_id,
    )
    expect(figure?.detail).toContain(occupation.name)
  })

  it('finds the subjects of a theme under the name of the theme', async () => {
    const { data: filed } = await supabase
      .from('subject_themes')
      .select('subject_id, themes!inner(name), subjects!inner(deleted_at)')
      .is('subjects.deleted_at', null)
      .limit(1)
      .single()
    if (!filed) throw new Error('No subject is filed under a theme in the local database')
    const theme = filed.themes as unknown as { name: string }

    const hits = await Effect.runPromise(searchSite(supabase, mangled(theme.name), EVERY))

    expect(
      hits.filter((hit) => hit.kind === 'subject').map((hit) => hit.id),
      `subjects found under « ${theme.name} »`,
    ).toContain(filed.subject_id)
  })

  it('finds a statement under the words of its quote, at the page of its author on its subject', async () => {
    const { data: statement } = await supabase
      .from('statements')
      .select('id, quote')
      .is('deleted_at', null)
      .is('joint_declaration_id', null)
      .not('quote', 'is', null)
      .order('id')
      .limit(1)
      .single()
    if (!statement?.quote) throw new Error('No quoted statement in the local database')
    const words = wordsOf(statement.quote).slice(0, 6).join(' ')

    const hits = await Effect.runPromise(searchSite(supabase, words, EVERY))
    const found = hits.find((hit) => hit.kind === 'statement' && hit.id === statement.id)
    if (found?.kind !== 'statement') throw new Error('The statement was not found under its quote')
    const whereabouts = await Effect.runPromise(statementWhereabouts(supabase, [statement.id]))

    expect(found.excerpt).not.toBeNull()
    expect(whereabouts.get(statement.id)).toEqual({
      author: { kind: found.authorKind, slug: found.slug },
      subjectSlug: found.subjectSlug,
    })
  })

  it('finds a joint declaration once, never once per signatory', async () => {
    const { data: signed } = await supabase
      .from('statements')
      .select('quote, joint_declaration_id')
      .is('deleted_at', null)
      .not('joint_declaration_id', 'is', null)
      .not('quote', 'is', null)
      .limit(1)
      .single()
    if (!signed?.quote) throw new Error('No joint declaration in the local database')
    const words = wordsOf(signed.quote).slice(0, 6).join(' ')

    const hits = await Effect.runPromise(searchSite(supabase, words, EVERY))

    expect(hits.filter((hit) => hit.kind === 'joint_declaration').map((hit) => hit.id)).toContain(
      signed.joint_declaration_id,
    )
    const { data: signatures } = await supabase
      .from('statements')
      .select('id')
      .not('joint_declaration_id', 'is', null)
    const signatureIds = new Set((signatures ?? []).map((s) => s.id))
    expect(hits.filter((hit) => hit.kind === 'statement' && signatureIds.has(hit.id))).toEqual([])
  })
})
