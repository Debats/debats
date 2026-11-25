import { describe, it, expect } from 'vitest'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../supabase/admin'
import { createStatementRepository } from '../database/statement-repository-supabase'
import { loadMovedStatements } from './position-changes'

/**
 * Runs against the local database (`npm run test:db`), on the rows it holds.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('get_moved_statements', () => {
  it('only reads the statements of figures who took several positions on a subject', async () => {
    const statements = await Effect.runPromise(loadMovedStatements(createAdminSupabaseClient()))

    const positions = new Map<string, Set<string>>()
    for (const { figure, subject, position } of statements) {
      const key = `${figure.id}:${subject.id}`
      positions.set(key, (positions.get(key) ?? new Set<string>()).add(position.id))
    }

    for (const taken of Array.from(positions.values())) {
      expect(taken.size).toBeGreaterThan(1)
    }
  }, 30_000)
})

describe.skipIf(!hasDatabase)('get_statements_to_review', () => {
  it('offers a page of statements nobody confirmed nor flagged, each once', async () => {
    const supabase = createAdminSupabaseClient()
    const statements = createStatementRepository(supabase)

    // One read: other tests add statements meanwhile, and two pages read apart could overlap
    const { entries: offered, total } = await Effect.runPromise(
      statements.findToReview(null, { limit: 4, offset: 0 }),
    )
    if (total < 4) throw new Error('Fewer than four unreviewed statements locally')

    expect(new Set(offered.map(({ statement }) => statement.id)).size).toBe(4)
    for (const { statement } of offered) {
      const { count: confirmed } = await supabase
        .from('confirmations')
        .select('entity_id', { count: 'exact', head: true })
        .eq('entity_id', statement.id)
      const { count: flagged } = await supabase
        .from('flags')
        .select('id', { count: 'exact', head: true })
        .eq('entity_id', statement.id)
        .eq('status', 'open')
      expect([confirmed, flagged]).toEqual([0, 0])
    }
  }, 30_000)

  it('never offers a reader a statement she added herself', async () => {
    const supabase = createAdminSupabaseClient()
    const statements = createStatementRepository(supabase)
    const page = { limit: 20, offset: 0 }
    const [first] = (await Effect.runPromise(statements.findToReview(null, page))).entries
    if (!first?.statement.createdBy) throw new Error('No authored unreviewed statement locally')
    const adder = first.statement.createdBy

    const offered = await Effect.runPromise(statements.findToReview(adder, page))

    expect(offered.entries.map(({ statement }) => statement.createdBy)).not.toContain(adder)
  }, 30_000)

  it('offers the last added first, and nothing past the end of the queue', async () => {
    const supabase = createAdminSupabaseClient()
    const statements = createStatementRepository(supabase)

    const { entries, total } = await Effect.runPromise(
      statements.findToReview(null, { limit: 20, offset: 0 }),
    )
    const added = entries.map(({ statement }) => statement.createdAt.getTime())
    // Well past the end: other tests add statements to the queue meanwhile
    const past = await Effect.runPromise(
      statements.findToReview(null, { limit: 20, offset: total + 50 }),
    )

    expect(added).toEqual([...added].sort((a, b) => b - a))
    expect(past).toEqual({ entries: [], total: 0 })
  }, 30_000)
})
