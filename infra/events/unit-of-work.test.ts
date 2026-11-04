import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Effect, Layer, TestClock, TestContext } from 'effect'
import { EventStore } from '../../domain/events/event-store'
import { runUnitOfWork, UnitOfWork } from '../../domain/events/unit-of-work'
import { grant, rewardFor } from '../../domain/use-cases/reward'
import { getPrismaClient } from '../prisma/client'
import { runUnitOfWork as runInPostgres } from './unit-of-work'

/**
 * Runs against the local database (`npm run test:db`), on a contributor the
 * seed provides: her reputation is read before and restored after. What the
 * in-memory journal proves about dating a command's facts, this proves on
 * Postgres, through the very helper every command goes through.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const prisma = () => getPrismaClient()

/** The command, run on a clock stopped on the instant it is taken on */
const takenOn = <A, E>(
  instant: Date,
  work: (events: EventStore, happenedAt: Date) => Effect.Effect<A, E>,
): Promise<A> =>
  Effect.runPromise(
    Effect.provide(
      Effect.andThen(TestClock.setTime(instant), runUnitOfWork(work)),
      Layer.merge(
        TestContext.TestContext,
        Layer.succeed(UnitOfWork, (w) => runInPostgres(w)),
      ),
    ),
  )

const REWARDED = 'edited_position'

let contributorId = ''
let reputationBefore = 0

describe.skipIf(!hasDatabase)('the transaction of a command, on Postgres', () => {
  beforeAll(async () => {
    // The last contributor by id: the projector's own test takes the first, and
    // the two files run side by side on the same database
    const contributor = await prisma().contributors.findFirstOrThrow({
      select: { id: true, reputation: true },
      orderBy: { id: 'desc' },
    })
    contributorId = contributor.id
    reputationBefore = contributor.reputation ?? 0
  })

  afterAll(async () => {
    await prisma().reputation_events.deleteMany({
      where: { contributor_id: contributorId, action: REWARDED, related_entity_id: null },
    })
    await prisma().domain_events.deleteMany({
      where: {
        stream_type: 'contributor',
        stream_id: contributorId,
        payload: { path: ['action'], equals: REWARDED },
      },
    })
    await prisma().contributors.update({
      where: { id: contributorId },
      data: { reputation: reputationBefore },
    })
    await prisma().$disconnect()
  })

  it('dates the fact it writes, and the row it projects, with the instant it was taken on', async () => {
    const commandedAt = new Date('2026-04-02T08:15:00.000Z')

    await takenOn(commandedAt, (events) =>
      grant(events, contributorId, rewardFor(contributorId, REWARDED)),
    )

    const fact = await prisma().domain_events.findFirst({
      where: { stream_type: 'contributor', stream_id: contributorId },
      orderBy: { revision: 'desc' },
    })
    expect(fact?.occurred_at).toEqual(commandedAt)
    const rows = await prisma().reputation_events.findMany({
      where: { contributor_id: contributorId, action: REWARDED, related_entity_id: null },
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].created_at).toEqual(commandedAt)
  })
})
