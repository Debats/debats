import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Effect, Either } from 'effect'
import {
  contributorStream,
  reputationGranted,
  replayContributor,
} from '../../domain/aggregates/contributor'
import { decodeContributorEvent } from '../../domain/aggregates/contributor-events'
import { grant, rewardFor } from '../../domain/use-cases/reward'
import { getPrismaClient } from '../prisma/client'
import { runUnitOfWork } from './unit-of-work'

/**
 * Runs against the local database (`npm run test:db`), on a contributor the
 * seed provides: her reputation is read before and restored after.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const prisma = () => getPrismaClient()

let contributorId = ''
let reputationBefore = 0

describe.skipIf(!hasDatabase)('contributor projector', () => {
  beforeAll(async () => {
    const contributor = await prisma().contributors.findFirstOrThrow({
      select: { id: true, reputation: true },
    })
    contributorId = contributor.id
    reputationBefore = contributor.reputation ?? 0
  })

  afterAll(async () => {
    await prisma().reputation_events.deleteMany({
      where: { contributor_id: contributorId, action: 'edited_subject', related_entity_id: null },
    })
    await prisma().domain_events.deleteMany({
      where: {
        stream_type: 'contributor',
        stream_id: contributorId,
        metadata: { equals: {} },
      },
    })
    await prisma().contributors.update({
      where: { id: contributorId },
      data: { reputation: reputationBefore },
    })
    await prisma().$disconnect()
  })

  it('writes the grant and lets the cache follow', async () => {
    await Effect.runPromise(
      runUnitOfWork((journal) =>
        grant(journal, contributorId, rewardFor(contributorId, 'edited_subject')),
      ),
    )

    const rows = await prisma().reputation_events.findMany({
      where: { contributor_id: contributorId, action: 'edited_subject', related_entity_id: null },
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ amount: 5, related_entity_type: null })
    const contributor = await prisma().contributors.findUniqueOrThrow({
      where: { id: contributorId },
    })
    expect(contributor.reputation).toBe(reputationBefore + 5)
  })

  it('rebuilds the reputation from the journal', async () => {
    const history = await Effect.runPromise(
      runUnitOfWork((journal) => journal.load(contributorStream(contributorId))),
    )
    const state = replayContributor(history)
    expect(Either.isRight(state) && state.right.reputation).toBe(reputationBefore + 5)
  })

  it('leaves a grant already in the table alone', async () => {
    const stored = await Effect.runPromise(
      runUnitOfWork((journal) => journal.load(contributorStream(contributorId))),
    )
    const last = stored.at(-1)!
    const again = reputationGranted({
      grantId: (last.payload as { grantId: string }).grantId,
      action: 'edited_subject',
      amount: 5,
    })
    await Effect.runPromise(
      runUnitOfWork((journal) =>
        journal.append(contributorStream(contributorId), last.revision, [again], {
          actorId: contributorId,
        }),
      ),
    )

    const rows = await prisma().reputation_events.findMany({
      where: { contributor_id: contributorId, action: 'edited_subject', related_entity_id: null },
    })
    expect(rows).toHaveLength(1)
  })
})

describe.skipIf(!hasDatabase)('contributor journal after the backfill', () => {
  afterAll(() => prisma().$disconnect())

  it('holds every reputation move of the table', async () => {
    const orphans = await prisma().$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count FROM reputation_events r
      WHERE NOT EXISTS (
        SELECT 1 FROM domain_events e
        WHERE e.stream_type = 'contributor' AND e.stream_id = r.contributor_id
          AND e.payload->>'grantId' = r.id::text
      )`
    expect(Number(orphans[0].count)).toBe(0)
  })

  it('decodes every contributor event the backfill wrote', async () => {
    const events = await prisma().domain_events.findMany({ where: { stream_type: 'contributor' } })
    const unreadable = events
      .map((row) =>
        decodeContributorEvent({
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

  it('replays every backfilled contributor to the reputation her row holds', async () => {
    const backfilled = await prisma().domain_events.findMany({
      where: { stream_type: 'contributor', metadata: { equals: { source: 'backfill' } } },
      select: { stream_id: true },
      distinct: ['stream_id'],
    })
    expect(backfilled.length).toBeGreaterThan(0)
    for (const { stream_id } of backfilled) {
      const row = await prisma().contributors.findUniqueOrThrow({ where: { id: stream_id } })
      const history = await Effect.runPromise(
        runUnitOfWork((journal) => journal.load(contributorStream(stream_id))),
      )
      const state = replayContributor(history)
      expect(Either.isRight(state) && state.right.reputation).toBe(row.reputation ?? 0)
    }
  })
})
