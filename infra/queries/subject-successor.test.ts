import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Effect } from 'effect'
import {
  subjectAdded,
  subjectDeleted,
  subjectMergedInto,
  subjectStream,
} from '../../domain/aggregates/subject'
import { SubjectEvent } from '../../domain/aggregates/subject-events'
import { runUnitOfWork } from '../events/unit-of-work'
import { getPrismaClient } from '../prisma/client'
import { createAdminSupabaseClient } from '../supabase/admin'
import { findSubjectSuccessorSlug } from './subject-successor'

/**
 * Runs against the local database (`npm run test:db`), on subjects of its
 * own, written through the journal: one merged into a second, itself merged
 * into a third that lives, and one merged into a subject deleted since.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const prisma = () => getPrismaClient()

const tag = crypto.randomUUID().slice(0, 8)
const [firstId, secondId, liveId, lostId, deletedId] = Array.from({ length: 5 }, () =>
  crypto.randomUUID(),
)
const slugOf = (name: string) => `successeur-${name}-${tag}`
let actorId = ''

const write = (subjectId: string, revision: number, events: SubjectEvent[]) =>
  Effect.runPromise(
    runUnitOfWork((journal) =>
      journal.append(subjectStream(subjectId), revision, events, { actorId }),
    ),
  )

const added = (name: string) =>
  subjectAdded({
    title: `Successeur ${name} ${tag}`,
    presentation: 'Une présentation suffisamment longue.',
    problem: 'Une problématique suffisamment longue ?',
  })

describe.skipIf(!hasDatabase)('findSubjectSuccessorSlug', () => {
  const successorOf = (slug: string) =>
    Effect.runPromise(findSubjectSuccessorSlug(createAdminSupabaseClient(), slug))

  beforeAll(async () => {
    actorId = (await prisma().contributors.findFirstOrThrow({ select: { id: true } })).id
    await write(liveId, 0, [added('vivant')])
    await write(secondId, 0, [added('deuxieme'), subjectMergedInto(liveId, [])])
    await write(firstId, 0, [added('premier'), subjectMergedInto(secondId, [])])
    await write(deletedId, 0, [added('supprime'), subjectDeleted()])
    await write(lostId, 0, [added('perdu'), subjectMergedInto(deletedId, [])])
  })

  afterAll(async () => {
    // A merged subject points at the one that took it in: it goes first
    for (const id of [firstId, secondId, lostId, deletedId, liveId]) {
      await prisma().subjects.deleteMany({ where: { id } })
    }
    await prisma().domain_events.deleteMany({
      where: {
        stream_type: 'subject',
        stream_id: { in: [firstId, secondId, liveId, lostId, deletedId] },
      },
    })
    await prisma().$disconnect()
  })

  it('leads a merged subject to the one that took it in', async () => {
    expect(await successorOf(slugOf('deuxieme'))).toBe(slugOf('vivant'))
  })

  it('follows merges in a row down to the subject that lives', async () => {
    expect(await successorOf(slugOf('premier'))).toBe(slugOf('vivant'))
  })

  it('has nothing to say of a live subject, of one simply deleted, or of an address never used', async () => {
    expect(await successorOf(slugOf('vivant'))).toBeNull()
    expect(await successorOf(slugOf('supprime'))).toBeNull()
    expect(await successorOf(`jamais-vu-${tag}`)).toBeNull()
  })

  it('stops where the trail ends on a subject deleted since', async () => {
    expect(await successorOf(slugOf('perdu'))).toBeNull()
  })
})
