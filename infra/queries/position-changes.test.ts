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

describe.skipIf(!hasDatabase)('get_statement_to_review', () => {
  it('offers a statement nobody confirmed nor flagged, and another one when asked', async () => {
    const supabase = createAdminSupabaseClient()
    const statements = createStatementRepository(supabase)

    const first = await Effect.runPromise(statements.findOneToReview(null, 0))
    const second = await Effect.runPromise(statements.findOneToReview(null, 1))
    if (!first || !second) throw new Error('Fewer than two unreviewed statements locally')

    expect(second.statement.id).not.toBe(first.statement.id)
    for (const { statement } of [first, second]) {
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
    const first = await Effect.runPromise(statements.findOneToReview(null, 0))
    if (!first?.statement.createdBy) throw new Error('No authored unreviewed statement locally')

    const offered = await Effect.runPromise(
      statements.findOneToReview(first.statement.createdBy, 0),
    )

    expect(offered?.statement.createdBy).not.toBe(first.statement.createdBy)
  }, 30_000)
})
