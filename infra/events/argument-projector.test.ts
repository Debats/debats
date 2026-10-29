import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Effect, Either } from 'effect'
import {
  argumentAbsorbed,
  argumentAdded,
  argumentStream,
  argumentMergedInto,
  argumentRenamed,
  replayArgument,
} from '../../domain/aggregates/argument'
import { ArgumentEvent, decodeArgumentEvent } from '../../domain/aggregates/argument-events'
import { getPrismaClient } from '../prisma/client'
import { runUnitOfWork } from './unit-of-work'

/** Runs against the local database (`npm run test:db`), on a contributor the seed provides. */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const prisma = () => getPrismaClient()

const argumentId = crypto.randomUUID()
const stream = argumentStream(argumentId)
let actorId = ''

const append = (revision: number, events: ArgumentEvent[]) =>
  Effect.runPromise(
    runUnitOfWork((journal) => journal.append(stream, revision, events, { actorId })),
  )

describe.skipIf(!hasDatabase)('argument projector', () => {
  beforeAll(async () => {
    actorId = (await prisma().contributors.findFirstOrThrow({ select: { id: true } })).id
  })

  afterAll(async () => {
    await prisma().arguments.deleteMany({ where: { id: argumentId } })
    await prisma().domain_events.deleteMany({
      where: { stream_type: 'argument', stream_id: argumentId },
    })
    await prisma().$disconnect()
  })

  it('writes the argument', async () => {
    await append(0, [argumentAdded({ title: 'Argument De Test', description: 'Pour le test.' })])

    const row = await prisma().arguments.findUniqueOrThrow({ where: { id: argumentId } })
    expect(row).toMatchObject({
      title: 'Argument De Test',
      slug: 'argument-de-test',
      description: 'Pour le test.',
      created_by: actorId,
      updated_by: actorId,
      deleted_at: null,
    })
  })

  it('renames the argument', async () => {
    await append(1, [argumentRenamed({ title: 'Argument Renommé', description: '' })])

    const row = await prisma().arguments.findUniqueOrThrow({ where: { id: argumentId } })
    expect(row).toMatchObject({
      title: 'Argument Renommé',
      slug: 'argument-renomme',
      description: '',
    })
  })

  it('keeps an argument that absorbed another, dated as the merge', async () => {
    const occurredAt = new Date('2021-02-03T04:05:06.000Z')
    await Effect.runPromise(
      runUnitOfWork((journal) =>
        journal.append(stream, 2, [argumentAbsorbed(crypto.randomUUID())], { actorId, occurredAt }),
      ),
    )

    const row = await prisma().arguments.findUniqueOrThrow({ where: { id: argumentId } })
    expect(row).toMatchObject({
      slug: 'argument-renomme',
      deleted_at: null,
      updated_at: occurredAt,
    })
  })

  it('retires a merged argument', async () => {
    await append(3, [argumentMergedInto(crypto.randomUUID())])

    const row = await prisma().arguments.findUniqueOrThrow({ where: { id: argumentId } })
    expect(row.deleted_at).not.toBeNull()
  })

  it('rebuilds from the journal what the table holds', async () => {
    const history = await Effect.runPromise(runUnitOfWork((journal) => journal.load(stream)))
    const state = replayArgument(history)
    expect(Either.isRight(state) && state.right).toMatchObject({
      argument: { slug: 'argument-renomme' },
      mergedInto: expect.any(String),
    })
  })
})

describe.skipIf(!hasDatabase)('argument journal after the backfill', () => {
  afterAll(() => prisma().$disconnect())

  it('holds a stream for every argument in the table', async () => {
    const orphans = await prisma().$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count FROM arguments a
      WHERE NOT EXISTS (
        SELECT 1 FROM domain_events e WHERE e.stream_type = 'argument' AND e.stream_id = a.id
      )`
    expect(Number(orphans[0].count)).toBe(0)
  })

  it('decodes every argument event the backfill wrote, one stream per row', async () => {
    const events = await prisma().domain_events.findMany({ where: { stream_type: 'argument' } })
    const rows = await prisma().arguments.count()
    const unreadable = events
      .map((row) =>
        decodeArgumentEvent({
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
    expect(new Set(events.map((e) => e.stream_id)).size).toBe(rows)
  })

  it('replays every backfilled argument to what its row holds', async () => {
    // Only the rows the backfill imported: other suites write arguments of their own meanwhile
    const backfilled = await prisma().domain_events.findMany({
      where: { stream_type: 'argument', metadata: { equals: { source: 'backfill' } } },
      select: { stream_id: true },
    })
    const rows = await prisma().arguments.findMany({
      where: { id: { in: backfilled.map((e) => e.stream_id) } },
    })
    for (const row of rows) {
      const history = await Effect.runPromise(
        runUnitOfWork((journal) => journal.load(argumentStream(row.id))),
      )
      const state = replayArgument(history)
      if (Either.isLeft(state) || !state.right) throw new Error(`No state for ${row.id}`)
      expect(state.right.argument).toMatchObject({
        title: row.title,
        slug: row.slug,
        description: row.description,
        createdBy: row.created_by,
      })
      expect(state.right.deletedAt).toEqual(row.deleted_at)
    }
  })
})
