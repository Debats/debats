import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Effect, Either } from 'effect'
import {
  occupationAdded,
  occupationFamilyAdded,
  occupationFamilyDeleted,
  occupationFamilyStream,
  occupationRemoved,
  replayOccupationFamily,
} from '../../domain/aggregates/occupation-family'
import {
  decodeOccupationFamilyEvent,
  OccupationFamilyEvent,
} from '../../domain/aggregates/occupation-family-events'
import { getPrismaClient } from '../prisma/client'
import { runUnitOfWork } from './unit-of-work'

/** Runs against the local database (`npm run test:db`), on a contributor the seed provides. */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const prisma = () => getPrismaClient()

const familyId = crypto.randomUUID()
const economistId = crypto.randomUUID()
const writerId = crypto.randomUUID()
const suffix = familyId.slice(0, 8)
const stream = occupationFamilyStream(familyId)
let actorId = ''

const append = (revision: number, events: OccupationFamilyEvent[]) =>
  Effect.runPromise(
    runUnitOfWork((journal) => journal.append(stream, revision, events, { actorId })),
  )

describe.skipIf(!hasDatabase)('occupation family projector', () => {
  beforeAll(async () => {
    actorId = (await prisma().contributors.findFirstOrThrow({ select: { id: true } })).id
  })

  afterAll(async () => {
    await prisma().occupation_families.deleteMany({ where: { id: familyId } })
    await prisma().domain_events.deleteMany({
      where: { stream_type: 'occupation_family', stream_id: familyId },
    })
    await prisma().$disconnect()
  })

  it('writes the family and its occupations', async () => {
    await append(0, [
      occupationFamilyAdded({ name: `Famille de test ${suffix}`, description: '', position: 99 }),
      occupationAdded(economistId, { name: `Économiste ${suffix}`, description: 'Pour le test.' }),
      occupationAdded(writerId, { name: `Écrivain·e ${suffix}`, description: '' }),
    ])

    const family = await prisma().occupation_families.findUniqueOrThrow({
      where: { id: familyId },
      include: { occupations: { orderBy: { name: 'asc' } } },
    })
    expect(family).toMatchObject({
      slug: `famille-de-test-${suffix}`,
      position: 99,
      created_by: actorId,
    })
    expect(family.occupations).toMatchObject([
      { id: economistId, slug: `economiste-${suffix}`, description: 'Pour le test.' },
      { id: writerId, slug: `ecrivain-e-${suffix}`, created_by: actorId },
    ])
  })

  it('removes a removed occupation from the table', async () => {
    await append(3, [occupationRemoved(writerId)])

    expect(await prisma().occupations.findUnique({ where: { id: writerId } })).toBeNull()
    expect(await prisma().occupations.findUnique({ where: { id: economistId } })).not.toBeNull()
  })

  it('removes a deleted family with its occupations', async () => {
    await append(4, [occupationFamilyDeleted()])

    expect(await prisma().occupation_families.findUnique({ where: { id: familyId } })).toBeNull()
    expect(await prisma().occupations.findUnique({ where: { id: economistId } })).toBeNull()
  })

  it('rebuilds from the journal what happened', async () => {
    const history = await Effect.runPromise(runUnitOfWork((journal) => journal.load(stream)))
    const state = replayOccupationFamily(history)
    expect(Either.isRight(state) && state.right).toMatchObject({
      family: { slug: `famille-de-test-${suffix}` },
      occupations: [{ id: economistId }],
      deletedAt: expect.any(Date),
    })
  })
})

describe.skipIf(!hasDatabase)('occupation family journal after the backfill', () => {
  afterAll(() => prisma().$disconnect())

  it('holds a stream for every family in the table', async () => {
    const orphans = await prisma().$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count FROM occupation_families f
      WHERE NOT EXISTS (
        SELECT 1 FROM domain_events e
        WHERE e.stream_type = 'occupation_family' AND e.stream_id = f.id
      )`
    expect(Number(orphans[0].count)).toBe(0)
  })

  it('decodes every family event the backfill wrote', async () => {
    const events = await prisma().domain_events.findMany({
      where: { stream_type: 'occupation_family' },
    })
    const unreadable = events
      .map((row) =>
        decodeOccupationFamilyEvent({
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

  it('replays every backfilled family to what its rows hold', async () => {
    // Only the rows the backfill imported: this suite writes a family of its own meanwhile
    const backfilled = await prisma().domain_events.findMany({
      where: { stream_type: 'occupation_family', metadata: { equals: { source: 'backfill' } } },
      select: { stream_id: true },
      distinct: ['stream_id'],
    })
    const rows = await prisma().occupation_families.findMany({
      where: { id: { in: backfilled.map((e) => e.stream_id) } },
      include: { occupations: true },
    })
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      const history = await Effect.runPromise(
        runUnitOfWork((journal) => journal.load(occupationFamilyStream(row.id))),
      )
      const state = replayOccupationFamily(history)
      if (Either.isLeft(state) || !state.right) throw new Error(`No state for ${row.id}`)
      expect(state.right.family).toMatchObject({
        name: row.name,
        slug: row.slug,
        position: row.position,
        createdBy: row.created_by,
      })
      const occupations = state.right.occupations.map((o) => [o.id, o.slug, o.createdBy]).sort()
      expect(occupations).toEqual(row.occupations.map((o) => [o.id, o.slug, o.created_by]).sort())
    }
  })
})
