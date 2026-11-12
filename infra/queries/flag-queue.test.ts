import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Effect } from 'effect'
import { flagged, flagsSettled, reviewStream } from '../../domain/aggregates/review'
import { ReviewEvent } from '../../domain/aggregates/review-events'
import { statementEditHref } from '../../domain/read-models/hrefs'
import { runUnitOfWork } from '../events/unit-of-work'
import { getPrismaClient } from '../prisma/client'
import { createAdminSupabaseClient } from '../supabase/admin'
import { describeEntities, loadFlags, loadOpenFlagsOf, reviewRevision } from './flag-queue'

/** Runs against the local database (`npm run test:db`), on a statement and two contributors it holds */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const prisma = () => getPrismaClient()

describe.skipIf(!hasDatabase)('flag queue read side', () => {
  let supabase: ReturnType<typeof createAdminSupabaseClient>
  let statementId = ''
  let reader = ''
  let moderator = ''
  /** The review of the statement may hold events from elsewhere: ours start after them */
  let before = 0
  const settledEntity = crypto.randomUUID()

  const write = (entityId: string, actorId: string, revision: number, event: ReviewEvent) =>
    Effect.runPromise(
      runUnitOfWork((journal) =>
        journal.append(reviewStream(entityId), revision, [event], { actorId }),
      ),
    )

  const aFlag = (entityType: 'statement' | 'subject', comment: string) =>
    flagged(entityType, { flagId: crypto.randomUUID(), reason: 'other', comment })

  beforeAll(async () => {
    supabase = createAdminSupabaseClient()
    const two = await prisma().contributors.findMany({ select: { id: true }, take: 2 })
    reader = two[0].id
    moderator = two[1].id
    statementId = (
      await prisma().statements.findFirstOrThrow({
        where: { deleted_at: null },
        select: { id: true },
      })
    ).id
    before = await reviewRevision(statementId)
    await write(statementId, reader, before, aFlag('statement', 'La citation est tronquée.'))
    await write(settledEntity, reader, 0, aFlag('subject', 'Le titre prend parti.'))
    await write(settledEntity, moderator, 1, flagsSettled('dismissed', 'Le titre est neutre.'))
  })

  afterAll(async () => {
    await prisma().flags.deleteMany({
      where: { comment: { in: ['La citation est tronquée.', 'Le titre prend parti.'] } },
    })
    await prisma().domain_events.deleteMany({
      where: { stream_type: 'review', stream_id: statementId, revision: { gt: before } },
    })
    await prisma().domain_events.deleteMany({
      where: { stream_type: 'review', stream_id: settledEntity },
    })
    await prisma().$disconnect()
  })

  it('lists the open flags of an entity, and tells where its review stands', async () => {
    const flags = await Effect.runPromise(
      loadOpenFlagsOf(supabase, { type: 'statement', id: statementId }),
    )

    expect(flags.map(({ comment }) => comment)).toContain('La citation est tronquée.')
    expect(flags.every(({ outcome }) => outcome === null)).toBe(true)
    expect(await reviewRevision(statementId)).toBe(before + 1)
    expect(await reviewRevision(crypto.randomUUID())).toBe(0)
  })

  it('keeps the settled flags apart, with what the moderator answered', async () => {
    const settled = await Effect.runPromise(loadFlags(supabase, { settled: true, type: 'subject' }))

    expect(settled.find(({ entity }) => entity.id === settledEntity)).toMatchObject({
      outcome: 'dismissed',
      answer: 'Le titre est neutre.',
    })
  })

  it('names a flagged statement by its author, and says where it is read and edited', async () => {
    const cards = await Effect.runPromise(
      describeEntities(supabase, [
        { type: 'statement', id: statementId },
        { type: 'subject', id: settledEntity },
      ]),
    )

    const card = cards.get(statementId)
    expect(card?.title).toBeTruthy()
    expect(card?.detail).toMatch(/^pour /)
    expect(card?.href).toMatch(/^\/[po]\/.+\/s\/.+/)
    expect(card?.editHref).toBe(statementEditHref(statementId))
    // An entity the tables do not hold has no card
    expect(cards.has(settledEntity)).toBe(false)
  })
})
