import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Effect } from 'effect'
import { confirmed, flagged, flagsSettled, reviewStream } from '../../domain/aggregates/review'
import { ReviewEvent } from '../../domain/aggregates/review-events'
import { runUnitOfWork } from '../events/unit-of-work'
import { getPrismaClient } from '../prisma/client'
import { createAdminSupabaseClient } from '../supabase/admin'
import { loadReviewDetail, loadReviewMarks } from './review'

/** Runs against the local database (`npm run test:db`), on two contributors the seed provides */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const prisma = () => getPrismaClient()

/** Two entities that need not exist: nothing ties a review to the row it is about */
const reviewed = crypto.randomUUID()
const settled = crypto.randomUUID()
const untouched = crypto.randomUUID()

describe.skipIf(!hasDatabase)('review read side', () => {
  let supabase: ReturnType<typeof createAdminSupabaseClient>
  let nadia = ''
  let camille = ''

  const write = (entityId: string, actorId: string, revision: number, event: ReviewEvent) =>
    Effect.runPromise(
      runUnitOfWork((journal) =>
        journal.append(reviewStream(entityId), revision, [event], { actorId }),
      ),
    )

  beforeAll(async () => {
    supabase = createAdminSupabaseClient()
    const two = await prisma().contributors.findMany({ select: { id: true }, take: 2 })
    nadia = two[0].id
    camille = two[1].id
    await write(reviewed, nadia, 0, confirmed('statement'))
    await write(
      reviewed,
      camille,
      1,
      flagged('statement', {
        flagId: crypto.randomUUID(),
        reason: 'source_mismatch',
        comment: 'Le lien renvoie vers une page supprimée.',
      }),
    )
    await write(
      settled,
      camille,
      0,
      flagged('subject', {
        flagId: crypto.randomUUID(),
        reason: 'other',
        comment: 'Le titre prend parti.',
      }),
    )
    await write(settled, nadia, 1, flagsSettled('dismissed', 'Le titre est neutre.'))
  })

  afterAll(async () => {
    const entities = { in: [reviewed, settled] }
    await prisma().confirmations.deleteMany({ where: { entity_id: entities } })
    await prisma().flags.deleteMany({ where: { entity_id: entities } })
    await prisma().domain_events.deleteMany({
      where: { stream_type: 'review', stream_id: entities },
    })
    await prisma().$disconnect()
  })

  it('counts the confirmations and the open flags, and says what the viewer did herself', async () => {
    const marks = await Effect.runPromise(
      loadReviewMarks(supabase, [reviewed, settled, untouched], nadia),
    )

    expect(marks).toEqual({
      [reviewed]: {
        confirmations: 1,
        openFlags: 1,
        confirmedByViewer: true,
        flaggedByViewer: false,
      },
    })
  })

  it('tells a visitor she did nothing: false, never null', async () => {
    const marks = await Effect.runPromise(loadReviewMarks(supabase, [reviewed], null))

    expect(marks[reviewed]).toMatchObject({ confirmedByViewer: false, flaggedByViewer: false })
  })

  it('details the open flags with what they say, and leaves out the settled ones', async () => {
    const open = await Effect.runPromise(
      loadReviewDetail(supabase, { type: 'statement', id: reviewed }, camille),
    )
    expect(open).toMatchObject({
      confirmations: 1,
      flags: [{ reason: 'source_mismatch', comment: 'Le lien renvoie vers une page supprimée.' }],
      addedByViewer: false,
    })
    expect(open.lastConfirmedAt).toBeInstanceOf(Date)

    const closed = await Effect.runPromise(
      loadReviewDetail(supabase, { type: 'subject', id: settled }, null),
    )
    expect(closed).toMatchObject({ confirmations: 0, flags: [], lastConfirmedAt: null })
  })
})
