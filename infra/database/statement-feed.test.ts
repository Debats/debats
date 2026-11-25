import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Effect } from 'effect'
import { FeedEntry, leadOf } from '../../domain/read-models/feed-entries'
import { getPrismaClient } from '../prisma/client'
import { createAdminSupabaseClient } from '../supabase/admin'
import { createStatementRepository } from './statement-repository-supabase'

/**
 * Runs against the local database (`npm run test:db`): a public figure of the
 * seed makes three statements dated after everything else on the site — two
 * the same day, one the day before —, so that they open the feed.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const prisma = () => getPrismaClient()

const tag = crypto.randomUUID().slice(0, 8)
const LAST_DAY = new Date('2099-06-02')
const DAY_BEFORE = new Date('2099-06-01')

describe.skipIf(!hasDatabase)('the feed, entry by entry', () => {
  let statements: ReturnType<typeof createStatementRepository>
  let figure: { id: string }
  const made: string[] = []

  const state = async (positionId: string, statedAt: Date) => {
    const actor = await prisma().contributors.findFirstOrThrow({ select: { id: true } })
    const statement = await prisma().statements.create({
      data: {
        position_id: positionId,
        public_figure_id: figure.id,
        source_name: `Source ${tag}`,
        source_url: `https://example.org/${tag}/${made.length}`,
        quote: 'Les mots qui énoncent la position.',
        stated_at: statedAt,
        created_by: actor.id,
      },
    })
    made.push(statement.id)
    return statement.id
  }

  const idsOf = (entry: FeedEntry) =>
    entry.kind === 'sameDay' ? entry.entries.map(({ statement }) => statement.id) : []

  let sameDay: string[]
  let dayBefore: string

  beforeAll(async () => {
    statements = createStatementRepository(createAdminSupabaseClient())
    figure = await prisma().public_figures.findFirstOrThrow({
      where: { deleted_at: null },
      select: { id: true },
    })
    const [first, second] = await prisma().positions.findMany({
      where: { deleted_at: null, subjects: { deleted_at: null } },
      select: { id: true },
      take: 2,
    })
    dayBefore = await state(first.id, DAY_BEFORE)
    sameDay = [await state(first.id, LAST_DAY), await state(second.id, LAST_DAY)]
  }, 60_000)

  afterAll(async () => {
    await prisma().statements.deleteMany({ where: { id: { in: made } } })
    await prisma().$disconnect()
  })

  it('makes one entry of what an author said the same day, and another of what she said the day before', async () => {
    const feed = await Effect.runPromise(statements.findFeed({}, 'stated', { limit: 2, offset: 0 }))

    const [latest, before] = feed.entries
    expect(latest.kind).toBe('sameDay')
    expect([...idsOf(latest)].sort()).toEqual([...sameDay].sort())
    expect(before).toMatchObject({ kind: 'statement' })
    expect(leadOf(before).statement.id).toBe(dayBefore)
  })

  it('pages by entries: an entry is never cut between two pages', async () => {
    const first = await Effect.runPromise(
      statements.findFeed({}, 'stated', { limit: 1, offset: 0 }),
    )
    const second = await Effect.runPromise(
      statements.findFeed({}, 'stated', { limit: 1, offset: 1 }),
    )

    expect(idsOf(first.entries[0])).toHaveLength(2)
    expect(leadOf(second.entries[0]).statement.id).toBe(dayBefore)
    expect(second.total).toBe(first.total)
  })

  it('counts its entries, and the statements they gather', async () => {
    const feed = await Effect.runPromise(statements.findFeed({}, 'stated', { limit: 1, offset: 0 }))
    const { count } = await createAdminSupabaseClient()
      .from('feed_statements')
      .select('id, positions!inner(deleted_at, subjects!inner(deleted_at))', {
        count: 'exact',
        head: true,
      })
      .is('deleted_at', null)
      .is('positions.deleted_at', null)
      .is('positions.subjects.deleted_at', null)

    expect(feed.statements).toBe(count)
    expect(feed.total).toBeLessThan(feed.statements)
  })

  it('narrows to one kind of author before gathering', async () => {
    const feed = await Effect.runPromise(
      statements.findFeed({ authorKind: 'organisation' }, 'stated', { limit: 5, offset: 0 }),
    )

    expect(feed.entries.map((entry) => leadOf(entry).author.kind)).not.toContain('public_figure')
  })

  it('ranks by the day a statement was added when asked', async () => {
    const feed = await Effect.runPromise(statements.findFeed({}, 'added', { limit: 1, offset: 0 }))

    // The statements of the test are the last added to the site; the latest two share their stated day
    expect([...idsOf(feed.entries[0])].sort()).toEqual([...sameDay].sort())
  })

  it('lists nothing past its last page', async () => {
    const { total } = await Effect.runPromise(
      statements.findFeed({}, 'stated', { limit: 1, offset: 0 }),
    )

    expect(
      await Effect.runPromise(statements.findFeed({}, 'stated', { limit: 5, offset: total })),
    ).toEqual({ entries: [], total: 0, statements: 0 })
  })
})
