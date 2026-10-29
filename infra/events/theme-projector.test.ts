import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Effect, Either } from 'effect'
import { themeAdded, themeDeleted, replayTheme, themeStream } from '../../domain/aggregates/theme'
import { decodeThemeEvent, ThemeEvent } from '../../domain/aggregates/theme-events'
import { UniqueTaken } from '../../domain/events/event-store'
import { getPrismaClient } from '../prisma/client'
import { runUnitOfWork } from './unit-of-work'

/** Runs against the local database (`npm run test:db`), on a contributor the seed provides. */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const prisma = () => getPrismaClient()

const themeId = crypto.randomUUID()
const stream = themeStream(themeId)
let actorId = ''

const append = (revision: number, events: ThemeEvent[]) =>
  Effect.runPromise(
    runUnitOfWork((journal) => journal.append(stream, revision, events, { actorId })),
  )

describe.skipIf(!hasDatabase)('theme projector', () => {
  beforeAll(async () => {
    actorId = (await prisma().contributors.findFirstOrThrow({ select: { id: true } })).id
  })

  afterAll(async () => {
    await prisma().themes.deleteMany({ where: { id: themeId } })
    await prisma().domain_events.deleteMany({ where: { stream_type: 'theme', stream_id: themeId } })
    await prisma().$disconnect()
  })

  it('writes the theme', async () => {
    await append(0, [
      themeAdded({ name: `Thème de test ${themeId.slice(0, 8)}`, description: 'Pour le test.' }),
    ])

    const row = await prisma().themes.findUniqueOrThrow({ where: { id: themeId } })
    expect(row).toMatchObject({
      slug: `theme-de-test-${themeId.slice(0, 8)}`,
      description: 'Pour le test.',
      created_by: actorId,
      updated_by: actorId,
    })
  })

  it('reports a name another theme took meanwhile as a value taken, not as a defect', async () => {
    const twin = themeStream(crypto.randomUUID())
    const outcome = await Effect.runPromise(
      Effect.either(
        runUnitOfWork((journal) =>
          journal.append(
            twin,
            0,
            [themeAdded({ name: `Thème de test ${themeId.slice(0, 8)}`, description: 'Doublon.' })],
            { actorId },
          ),
        ),
      ),
    )

    expect(Either.isLeft(outcome) && outcome.left).toBeInstanceOf(UniqueTaken)
    expect(Either.isLeft(outcome) && (outcome.left as UniqueTaken).constraint).toBe(
      'themes_name_key',
    )
    const loaded = await Effect.runPromise(runUnitOfWork((journal) => journal.load(twin)))
    expect(loaded).toEqual([])
  })

  it('removes a deleted theme from the table', async () => {
    await append(1, [themeDeleted()])

    expect(await prisma().themes.findUnique({ where: { id: themeId } })).toBeNull()
  })

  it('rebuilds from the journal what happened', async () => {
    const history = await Effect.runPromise(runUnitOfWork((journal) => journal.load(stream)))
    const state = replayTheme(history)
    expect(Either.isRight(state) && state.right).toMatchObject({
      theme: { slug: `theme-de-test-${themeId.slice(0, 8)}` },
      deletedAt: expect.any(Date),
    })
  })
})

describe.skipIf(!hasDatabase)('theme journal after the backfill', () => {
  afterAll(() => prisma().$disconnect())

  it('holds a stream for every theme in the table', async () => {
    const orphans = await prisma().$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count FROM themes t
      WHERE NOT EXISTS (
        SELECT 1 FROM domain_events e WHERE e.stream_type = 'theme' AND e.stream_id = t.id
      )`
    expect(Number(orphans[0].count)).toBe(0)
  })

  it('decodes every theme event the backfill wrote', async () => {
    const events = await prisma().domain_events.findMany({ where: { stream_type: 'theme' } })
    const unreadable = events
      .map((row) =>
        decodeThemeEvent({
          type: row.type,
          payload: row.payload,
          streamType: row.stream_type,
          streamId: row.stream_id,
          revision: row.revision,
          actorId: row.actor_id,
          metadata: row.metadata as Record<string, unknown>,
          occurredAt: row.occurred_at,
        }),
      )
      .filter(Either.isLeft)
    expect(unreadable.map((e) => e.left.message)).toEqual([])
    expect(events.length).toBeGreaterThan(0)
  })

  it('replays every backfilled theme to what its row holds', async () => {
    // Only the rows the backfill imported: other suites write themes of their own meanwhile
    const backfilled = await prisma().domain_events.findMany({
      where: { stream_type: 'theme', metadata: { equals: { source: 'backfill' } } },
      select: { stream_id: true },
    })
    const rows = await prisma().themes.findMany({
      where: { id: { in: backfilled.map((e) => e.stream_id) } },
    })
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      const history = await Effect.runPromise(
        runUnitOfWork((journal) => journal.load(themeStream(row.id))),
      )
      const state = replayTheme(history)
      if (Either.isLeft(state) || !state.right) throw new Error(`No state for ${row.id}`)
      expect(state.right.theme).toMatchObject({
        name: row.name,
        slug: row.slug,
        description: row.description,
        createdBy: row.created_by,
      })
    }
  })
})
