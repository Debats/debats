import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Effect, Either, Option } from 'effect'
import {
  organisationAdded,
  organisationEdited,
  organisationStream,
  replayOrganisation,
} from '../../domain/aggregates/organisation'
import {
  decodeOrganisationEvent,
  OrganisationEvent,
} from '../../domain/aggregates/organisation-events'
import { getPrismaClient } from '../prisma/client'
import { runUnitOfWork } from './unit-of-work'

/** Runs against the local database (`npm run test:db`), on a contributor the seed provides. */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const prisma = () => getPrismaClient()

const organisationId = crypto.randomUUID()
const stream = organisationStream(organisationId)
let actorId = ''

const append = (revision: number, events: OrganisationEvent[]) =>
  Effect.runPromise(
    runUnitOfWork((journal) => journal.append(stream, revision, events, { actorId })),
  )

describe.skipIf(!hasDatabase)('organisation projector', () => {
  beforeAll(async () => {
    actorId = (await prisma().contributors.findFirstOrThrow({ select: { id: true } })).id
  })

  afterAll(async () => {
    await prisma().organisations.deleteMany({ where: { id: organisationId } })
    await prisma().domain_events.deleteMany({
      where: { stream_type: 'organisation', stream_id: organisationId },
    })
    await prisma().$disconnect()
  })

  it('writes the organisation', async () => {
    await append(0, [
      organisationAdded({
        name: 'Organisation De Test',
        acronym: 'ODT',
        organisationType: 'association',
        presentation: 'Une présentation suffisamment longue.',
        wikipediaUrl: 'https://fr.wikipedia.org/wiki/Test',
        notorietySources: [],
      }),
    ])

    const row = await prisma().organisations.findUniqueOrThrow({ where: { id: organisationId } })
    expect(row).toMatchObject({
      slug: 'organisation-de-test',
      acronym: 'ODT',
      organisation_type: 'association',
      wikipedia_url: 'https://fr.wikipedia.org/wiki/Test',
      website_url: null,
      notoriety_sources: [],
      created_by: actorId,
      updated_by: actorId,
      deleted_at: null,
    })
  })

  it('edits the organisation', async () => {
    await append(1, [
      organisationEdited({
        name: 'Organisation Renommée',
        organisationType: 'ngo',
        presentation: 'Une présentation suffisamment longue.',
        websiteUrl: 'https://example.org',
        notorietySources: ['https://a.example', 'https://b.example'],
      }),
    ])

    const row = await prisma().organisations.findUniqueOrThrow({ where: { id: organisationId } })
    expect(row).toMatchObject({
      slug: 'organisation-renommee',
      acronym: null,
      organisation_type: 'ngo',
      wikipedia_url: null,
      website_url: 'https://example.org',
      notoriety_sources: ['https://a.example', 'https://b.example'],
    })
  })

  it('dates the row as the event says, not as the clock: a replay stays faithful', async () => {
    const occurredAt = new Date('2020-05-06T07:08:09.000Z')
    await Effect.runPromise(
      runUnitOfWork((journal) =>
        journal.append(
          stream,
          2,
          [
            organisationEdited({
              name: 'Organisation Renommée',
              organisationType: 'ngo',
              presentation: 'Une présentation suffisamment longue.',
              websiteUrl: 'https://example.org',
              notorietySources: ['https://a.example', 'https://b.example'],
            }),
          ],
          { actorId, occurredAt },
        ),
      ),
    )

    const row = await prisma().organisations.findUniqueOrThrow({ where: { id: organisationId } })
    expect(row.updated_at).toEqual(occurredAt)
  })

  it('rebuilds from the journal what the table holds', async () => {
    const history = await Effect.runPromise(runUnitOfWork((journal) => journal.load(stream)))
    const state = replayOrganisation(history)
    expect(Either.isRight(state) && state.right).toMatchObject({
      organisation: {
        slug: 'organisation-renommee',
        organisationType: 'ngo',
        websiteUrl: Option.some('https://example.org'),
      },
      deletedAt: null,
    })
  })
})

describe.skipIf(!hasDatabase)('organisation journal after the backfill', () => {
  afterAll(() => prisma().$disconnect())

  it('holds a stream for every organisation in the table', async () => {
    const orphans = await prisma().$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count FROM organisations o
      WHERE NOT EXISTS (
        SELECT 1 FROM domain_events e WHERE e.stream_type = 'organisation' AND e.stream_id = o.id
      )`
    expect(Number(orphans[0].count)).toBe(0)
  })

  it('decodes every organisation event the backfill wrote', async () => {
    const events = await prisma().domain_events.findMany({ where: { stream_type: 'organisation' } })
    const unreadable = events
      .map((row) =>
        decodeOrganisationEvent({
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

  it('replays every organisation to what its row holds', async () => {
    const rows = await prisma().organisations.findMany()
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      const history = await Effect.runPromise(
        runUnitOfWork((journal) => journal.load(organisationStream(row.id))),
      )
      const state = replayOrganisation(history)
      if (Either.isLeft(state) || !state.right) throw new Error(`No state for ${row.id}`)
      expect(state.right.organisation).toMatchObject({
        name: row.name,
        slug: row.slug,
        acronym: Option.fromNullable(row.acronym),
        organisationType: row.organisation_type,
        createdBy: row.created_by,
      })
      expect(state.right.deletedAt).toEqual(row.deleted_at)
    }
  })
})
