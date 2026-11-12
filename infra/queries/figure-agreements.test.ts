import { describe, it, expect, beforeAll } from 'vitest'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../supabase/admin'
import { FigureAgreement } from '../../domain/read-models/figure-agreements'
import { loadFigureAgreements } from './figure-agreements'

/**
 * Runs against the local database (`npm run test:db`), on the rows it holds:
 * the first pair is counted again from the statements of its two figures.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('get_figure_agreements', () => {
  let supabase: ReturnType<typeof createAdminSupabaseClient>
  let agreements: FigureAgreement[] = []

  /** subject id → the positions a figure took on it, among what is still there */
  const taken = async (figureId: string) => {
    const { data, error } = await supabase
      .from('statements')
      .select('position_id, positions!inner(subject_id, deleted_at, subjects!inner(deleted_at))')
      .eq('public_figure_id', figureId)
      .is('deleted_at', null)
      .is('positions.deleted_at', null)
      .is('positions.subjects.deleted_at', null)
    if (error) throw error
    const bySubject = new Map<string, Set<string>>()
    for (const row of data) {
      const positions = bySubject.get(row.positions.subject_id) ?? new Set<string>()
      bySubject.set(row.positions.subject_id, positions.add(row.position_id))
    }
    return bySubject
  }

  beforeAll(async () => {
    supabase = createAdminSupabaseClient()
    agreements = await Effect.runPromise(loadFigureAgreements(supabase, 20))
  }, 30_000)

  it('counts the subjects both spoke on, and those on which they share a position', async () => {
    const [pair] = agreements
    if (!pair) throw new Error('No pair of figures present enough in the local database')
    const [hers, his] = await Promise.all([taken(pair.a.id), taken(pair.b.id)])

    const common = Array.from(hers.keys()).filter((subjectId) => his.has(subjectId))
    const agreed = common.filter((subjectId) =>
      Array.from(hers.get(subjectId) ?? []).some((positionId) =>
        his.get(subjectId)?.has(positionId),
      ),
    )

    expect(pair.commonSubjects).toBe(common.length)
    expect(pair.agreedSubjects).toBe(agreed.length)
    expect(pair.examples.length).toBe(Math.min(3, agreed.length))
  })

  it('names each pair once, the pairs agreeing on the most subjects first', () => {
    const keys = agreements.map((pair) => [pair.a.id, pair.b.id].sort().join())
    expect(new Set(keys).size).toBe(keys.length)

    const agreed = agreements.map((pair) => pair.agreedSubjects)
    expect(agreed).toEqual([...agreed].sort((a, b) => b - a))
  })

  it('reads no more pairs than asked', async () => {
    expect(await Effect.runPromise(loadFigureAgreements(supabase, 2))).toHaveLength(
      Math.min(2, agreements.length),
    )
  })
})
