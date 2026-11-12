import { describe, it, expect, beforeAll } from 'vitest'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../supabase/admin'
import { Debate } from '../../domain/read-models/home-debates'
import { loadHomeDebates, loadSiteFigures } from './home-debates'

/**
 * Runs against the local database (`npm run test:db`), on the rows it holds:
 * each count of the functions is checked against the tables it reads.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('get_home_debates', () => {
  let supabase: ReturnType<typeof createAdminSupabaseClient>
  let debates: Debate[] = []

  beforeAll(async () => {
    supabase = createAdminSupabaseClient()
    debates = await Effect.runPromise(loadHomeDebates(supabase, new Date(0)))
  }, 30_000)

  it('lists every live subject once', async () => {
    const { count } = await supabase
      .from('subjects')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)

    expect(debates).toHaveLength(count ?? -1)
    expect(new Set(debates.map((debate) => debate.id)).size).toBe(debates.length)
  })

  it('counts as voices the distinct live authors of the live statements of a subject', async () => {
    // The check reads the statements back in one page: PostgREST caps it at a thousand rows
    const debate = debates
      .filter((candidate) => candidate.statementsCount < 1000)
      .sort((a, b) => b.voices - a.voices)[0]
    if (!debate) throw new Error('No subject in the local database')

    const { data, error } = await supabase
      .from('statements')
      .select(
        'position_id, public_figures(id, deleted_at), organisations(id, deleted_at), positions!inner(subject_id, deleted_at)',
      )
      .is('deleted_at', null)
      .is('positions.deleted_at', null)
      .eq('positions.subject_id', debate.id)
    if (error) throw error

    const authored = data
      .map((row) => ({
        positionId: row.position_id,
        author: [row.public_figures, row.organisations].find((a) => a && a.deleted_at === null),
      }))
      .filter((row) => row.author)
    const voicesOn = (rows: typeof authored) => new Set(rows.map((row) => row.author?.id)).size

    expect(debate.voices).toBe(voicesOn(authored))
    expect(debate.statementsCount).toBe(authored.length)
    for (const position of debate.positions) {
      expect(position.voices).toBe(voicesOn(authored.filter((r) => r.positionId === position.id)))
    }
  })

  it('lists the positions of a subject from the most to the least supported', () => {
    for (const debate of debates) {
      const voices = debate.positions.map((position) => position.voices)
      expect(voices).toEqual([...voices].sort((a, b) => b - a))
    }
  })
})

describe.skipIf(!hasDatabase)('get_site_figures', () => {
  it('counts the live rows of each table', async () => {
    const supabase = createAdminSupabaseClient()
    const live = async (table: 'subjects' | 'statements' | 'public_figures' | 'organisations') => {
      const { count } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
      return count
    }

    const figures = await Effect.runPromise(loadSiteFigures(supabase))

    expect(figures.subjects).toBe(await live('subjects'))
    expect(figures.statements).toBe(await live('statements'))
    expect(figures.publicFigures).toBe(await live('public_figures'))
    expect(figures.organisations).toBe(await live('organisations'))
    expect(figures.sources).toBeGreaterThan(0)
    expect(figures.sources).toBeLessThanOrEqual(figures.statements)
  }, 30_000)
})
