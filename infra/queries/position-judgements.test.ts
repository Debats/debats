import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Effect } from 'effect'
import {
  positionAdded,
  positionsJudged,
  subjectAdded,
  subjectStream,
} from '../../domain/aggregates/subject'
import { runUnitOfWork } from '../events/unit-of-work'
import { getPrismaClient } from '../prisma/client'
import { createAdminSupabaseClient } from '../supabase/admin'
import { findJudgedPairs } from './position-judgements'

/**
 * Runs against the local database (`npm run test:db`), on a subject of its
 * own, written through the journal as a command would.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const prisma = () => getPrismaClient()

const subjectId = crypto.randomUUID()
const [first, second, third] = [
  crypto.randomUUID(),
  crypto.randomUUID(),
  crypto.randomUUID(),
].sort()

const position = (positionId: string, title: string) =>
  positionAdded({ positionId, title, description: 'Une description suffisamment longue.' })

describe.skipIf(!hasDatabase)('findJudgedPairs', () => {
  beforeAll(async () => {
    const { id: actorId } = await prisma().contributors.findFirstOrThrow({ select: { id: true } })
    await Effect.runPromise(
      runUnitOfWork((journal) =>
        journal.append(
          subjectStream(subjectId),
          0,
          [
            subjectAdded({
              title: `Un sujet jugé ${subjectId}`,
              presentation: 'Une présentation suffisamment longue.',
              problem: 'Une problématique suffisamment longue ?',
            }),
            position(first, 'Première'),
            position(second, 'Deuxième'),
            position(third, 'Troisième'),
            positionsJudged(second, first, true),
            positionsJudged(first, third, false),
          ],
          { actorId },
        ),
      ),
    )
  })

  afterAll(async () => {
    await prisma().subjects.deleteMany({ where: { id: subjectId } })
    await prisma().domain_events.deleteMany({
      where: { stream_type: 'subject', stream_id: subjectId },
    })
    await prisma().$disconnect()
  })

  it('reads the pairs judged on a subject, compatible or not', async () => {
    const judged = await Effect.runPromise(
      findJudgedPairs(createAdminSupabaseClient(), [subjectId]),
    )

    expect(judged).toHaveLength(2)
    expect(judged).toEqual(
      expect.arrayContaining([
        { positionIds: [first, second], compatible: true },
        { positionIds: [first, third], compatible: false },
      ]),
    )
  })

  it('reads nothing of another subject, nor without a subject', async () => {
    const supabase = createAdminSupabaseClient()

    expect(await Effect.runPromise(findJudgedPairs(supabase, [crypto.randomUUID()]))).toEqual([])
    expect(await Effect.runPromise(findJudgedPairs(supabase, []))).toEqual([])
  })
})
