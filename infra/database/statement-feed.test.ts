import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Effect } from 'effect'
import { FeedEntry, leadOf, NAMED_IN_ENTRY } from '../../domain/read-models/feed-entries'
import {
  addTestFigure,
  addTestStatement,
  addTestSubject,
  removeTestWrites,
} from '../events/journal-test-helpers'
import { getPrismaClient } from '../prisma/client'
import { createAdminSupabaseClient } from '../supabase/admin'
import { createStatementRepository } from './statement-repository-supabase'

/**
 * Runs against the local database (`npm run test:db`): a public figure of its
 * own makes statements on a subject of its own, dated after everything else
 * on the site — several the same day, one the day before —, so that they open
 * the feed ranked by the day stated, whatever the other tests add meanwhile.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const prisma = () => getPrismaClient()

const tag = crypto.randomUUID().slice(0, 8)
const LAST_DAY = new Date('2099-06-02')
const DAY_BEFORE = new Date('2099-06-01')
/** More statements the same day than an entry names */
const SAME_DAY = NAMED_IN_ENTRY + 2

describe.skipIf(!hasDatabase)('the feed, entry by entry', () => {
  let statements: ReturnType<typeof createStatementRepository>
  let figureId: string
  let subjectId: string

  const idsOf = (entry: FeedEntry) =>
    entry.kind === 'sameDay' ? entry.entries.map(({ statement }) => statement.id) : []
  const first = (limit: number, offset = 0) => ({ limit, offset })

  const sameDay: string[] = []
  let dayBefore: string

  beforeAll(async () => {
    statements = createStatementRepository(createAdminSupabaseClient())
    const actorId = (await prisma().contributors.findFirstOrThrow({ select: { id: true } })).id
    figureId = await addTestFigure(actorId, `Personnalité Du Flux ${tag}`)
    const subject = await addTestSubject(actorId, `Sujet du flux ${tag}`)
    subjectId = subject.subjectId
    const state = (statedAt: Date, rank: number) =>
      addTestStatement(actorId, {
        figureId,
        ...subject,
        statedAt,
        sourceName: `Source ${tag}`,
        sourceUrl: `https://example.org/${tag}/${rank}`,
      })

    dayBefore = await state(DAY_BEFORE, 0)
    for (let rank = 1; rank <= SAME_DAY; rank += 1) sameDay.push(await state(LAST_DAY, rank))
  }, 60_000)

  afterAll(async () => {
    // Her statements go with her
    await removeTestWrites({ subjectIds: [subjectId], figureIds: [figureId] })
    await prisma().$disconnect()
  })

  it('makes one entry of what an author said the same day, and another of what she said the day before', async () => {
    const feed = await Effect.runPromise(
      statements.findFeed({}, 'stated', 'signatures-and-days', first(2)),
    )

    const [latest, before] = feed.entries
    expect(latest.kind).toBe('sameDay')
    expect(before).toMatchObject({ kind: 'statement' })
    expect(leadOf(before).statement.id).toBe(dayBefore)
  })

  it('reads the first statements of a gathered entry, and counts the others', async () => {
    const feed = await Effect.runPromise(
      statements.findFeed({}, 'stated', 'signatures-and-days', first(1)),
    )

    const [latest] = feed.entries
    expect(idsOf(latest)).toHaveLength(NAMED_IN_ENTRY)
    expect(sameDay).toEqual(expect.arrayContaining(idsOf(latest)))
    expect(latest).toMatchObject({ others: SAME_DAY - NAMED_IN_ENTRY })
  })

  it('pages by entries: an entry is never cut between two pages', async () => {
    const one = await Effect.runPromise(
      statements.findFeed({}, 'stated', 'signatures-and-days', first(1)),
    )
    const two = await Effect.runPromise(
      statements.findFeed({}, 'stated', 'signatures-and-days', first(1, 1)),
    )

    expect(one.entries[0].kind).toBe('sameDay')
    expect(leadOf(two.entries[0]).statement.id).toBe(dayBefore)
  })

  it('lists every statement of an author on its own when only signatures are gathered', async () => {
    const feed = await Effect.runPromise(
      statements.findFeed({}, 'stated', 'signatures', first(SAME_DAY + 1)),
    )

    expect(feed.entries.map(({ kind }) => kind)).not.toContain('sameDay')
    expect(feed.entries.map((entry) => leadOf(entry).statement.id).sort()).toEqual(
      [...sameDay, dayBefore].sort(),
    )
  })

  it('counts the same statements however they are gathered, in fewer entries when days are gathered too', async () => {
    const [detailed, gathered] = await Effect.runPromise(
      Effect.all([
        statements.findFeed({}, 'stated', 'signatures', first(1)),
        statements.findFeed({}, 'stated', 'signatures-and-days', first(1)),
      ]),
    )

    expect(gathered.total).toBeLessThan(detailed.total)
    expect(detailed.total).toBeLessThanOrEqual(detailed.statements)
    // Other tests add statements meanwhile: the two reads may differ by a few
    expect(Math.abs(gathered.statements - detailed.statements)).toBeLessThan(20)
  })

  it('narrows to one kind of author before gathering', async () => {
    const feed = await Effect.runPromise(
      statements.findFeed(
        { authorKind: 'organisation' },
        'stated',
        'signatures-and-days',
        first(5),
      ),
    )

    expect(feed.entries.map((entry) => leadOf(entry).author.kind)).not.toContain('public_figure')
  })

  it('ranks by the day a statement was added when asked, the last added first', async () => {
    const feed = await Effect.runPromise(statements.findFeed({}, 'added', 'signatures', first(10)))

    const added = feed.entries.map((entry) => leadOf(entry).statement.createdAt.getTime())
    expect(added).toEqual([...added].sort((a, b) => b - a))
  })

  it('lists nothing past its last page', async () => {
    const { total } = await Effect.runPromise(
      statements.findFeed({}, 'stated', 'signatures', first(1)),
    )

    expect(
      await Effect.runPromise(
        statements.findFeed({}, 'stated', 'signatures', first(5, total + 50)),
      ),
    ).toEqual({ entries: [], total: 0, statements: 0 })
  })
})
