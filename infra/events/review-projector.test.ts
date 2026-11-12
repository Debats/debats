import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Effect } from 'effect'
import {
  confirmationsReset,
  confirmationWithdrawn,
  confirmed,
  flagged,
  flagsSettled,
  flagWithdrawn,
  reviewStream,
} from '../../domain/aggregates/review'
import { ReviewEvent } from '../../domain/aggregates/review-events'
import { getPrismaClient } from '../prisma/client'
import { runUnitOfWork } from './unit-of-work'

/** Runs against the local database (`npm run test:db`), on two contributors the seed provides. */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const prisma = () => getPrismaClient()

/** The review of an entity that need not exist: nothing ties the two tables to it */
const entityId = crypto.randomUUID()
const stream = reviewStream(entityId)
const flagId = crypto.randomUUID()
let reader = ''
let moderator = ''
let revision = 0

const append = async (actorId: string, ...events: ReviewEvent[]) => {
  await Effect.runPromise(
    runUnitOfWork((journal) => journal.append(stream, revision, events, { actorId })),
  )
  revision += events.length
}

const confirmations = () => prisma().confirmations.findMany({ where: { entity_id: entityId } })
const flags = () => prisma().flags.findMany({ where: { entity_id: entityId } })

describe.skipIf(!hasDatabase)('review projector', () => {
  beforeAll(async () => {
    const two = await prisma().contributors.findMany({ select: { id: true }, take: 2 })
    reader = two[0].id
    moderator = two[1].id
  })

  afterAll(async () => {
    await prisma().confirmations.deleteMany({ where: { entity_id: entityId } })
    await prisma().flags.deleteMany({ where: { entity_id: entityId } })
    await prisma().domain_events.deleteMany({
      where: { stream_type: 'review', stream_id: entityId },
    })
    await prisma().$disconnect()
  })

  it('writes a confirmation signed by its reader, and removes it when withdrawn', async () => {
    await append(reader, confirmed('statement'))
    expect(await confirmations()).toMatchObject([
      { entity_type: 'statement', entity_id: entityId, created_by: reader },
    ])

    await append(reader, confirmationWithdrawn())
    expect(await confirmations()).toEqual([])
  })

  it('writes an open flag, and removes it when its reader withdraws it', async () => {
    const withdrawn = crypto.randomUUID()
    await append(
      reader,
      flagged('statement', { flagId: withdrawn, reason: 'duplicate', comment: 'Déjà saisie.' }),
    )
    expect(await flags()).toMatchObject([
      { id: withdrawn, reason: 'duplicate', status: 'open', created_by: reader },
    ])

    await append(reader, flagWithdrawn(withdrawn))
    expect(await flags()).toEqual([])
  })

  it('closes the open flags with the outcome, the answer and the moderator who settled them', async () => {
    await append(
      reader,
      flagged('statement', { flagId, reason: 'source_mismatch', comment: 'Lien mort.' }),
    )
    await append(moderator, flagsSettled('dismissed', 'La source dit bien cela.'))

    expect(await flags()).toMatchObject([
      {
        id: flagId,
        status: 'dismissed',
        answer: 'La source dit bien cela.',
        created_by: reader,
        updated_by: moderator,
      },
    ])
  })

  it('empties the confirmations of the entity when a correction resets them', async () => {
    await append(reader, confirmed('statement'))
    await append(moderator, confirmed('statement'))
    expect(await confirmations()).toHaveLength(2)

    await append(moderator, confirmationsReset())
    expect(await confirmations()).toEqual([])
  })
})
