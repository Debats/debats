import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Effect, Either, Option } from 'effect'
import {
  membershipAdded,
  publicFigureAdded,
  publicFigureEdited,
  publicFigureStream,
  membershipRemoved,
  replayPublicFigure,
  occupationsSet,
} from '../../domain/aggregates/public-figure'
import {
  decodePublicFigureEvent,
  PublicFigureEvent,
} from '../../domain/aggregates/public-figure-events'
import { getPrismaClient } from '../prisma/client'
import { runUnitOfWork } from './unit-of-work'

/**
 * Runs against the local database (`npm run test:db`), on rows the seed
 * provides: a contributor, two occupations and an organisation.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const prisma = () => getPrismaClient()

const figureId = crypto.randomUUID()
const stream = publicFigureStream(figureId)
const membershipId = crypto.randomUUID()
let actorId = ''
let occupationIds: string[] = []
let organisationId = ''

const append = (revision: number, events: PublicFigureEvent[]) =>
  Effect.runPromise(
    runUnitOfWork((journal) => journal.append(stream, revision, events, { actorId })),
  )

describe.skipIf(!hasDatabase)('public figure projector', () => {
  beforeAll(async () => {
    actorId = (await prisma().contributors.findFirstOrThrow({ select: { id: true } })).id
    occupationIds = (await prisma().occupations.findMany({ select: { id: true }, take: 2 })).map(
      (o) => o.id,
    )
    organisationId = (await prisma().organisations.findFirstOrThrow({ select: { id: true } })).id
  })

  afterAll(async () => {
    await prisma().public_figures.deleteMany({ where: { id: figureId } })
    await prisma().domain_events.deleteMany({
      where: { stream_type: 'public_figure', stream_id: figureId },
    })
    await prisma().$disconnect()
  })

  it('writes the figure', async () => {
    await append(0, [
      publicFigureAdded({
        name: 'Personnalité De Test',
        presentation: 'Une présentation suffisamment longue.',
        wikipediaUrl: 'https://fr.wikipedia.org/wiki/Test',
        notorietySources: [],
      }),
    ])

    const row = await prisma().public_figures.findUniqueOrThrow({ where: { id: figureId } })
    expect(row).toMatchObject({
      slug: 'personnalite-de-test',
      wikipedia_url: 'https://fr.wikipedia.org/wiki/Test',
      website_url: null,
      notoriety_sources: [],
      created_by: actorId,
    })
  })

  it('edits the figure', async () => {
    await append(1, [
      publicFigureEdited({
        name: 'Personnalité Renommée',
        presentation: 'Une présentation suffisamment longue.',
        websiteUrl: 'https://example.org',
        notorietySources: ['https://a.example', 'https://b.example'],
      }),
    ])

    const row = await prisma().public_figures.findUniqueOrThrow({ where: { id: figureId } })
    expect(row).toMatchObject({
      slug: 'personnalite-renommee',
      wikipedia_url: null,
      website_url: 'https://example.org',
      notoriety_sources: ['https://a.example', 'https://b.example'],
    })
  })

  it('sets the occupations, then replaces them', async () => {
    await append(2, [occupationsSet([{ occupationId: occupationIds[0], current: true }])])
    await append(3, [
      occupationsSet([
        { occupationId: occupationIds[0], current: false },
        { occupationId: occupationIds[1], current: true },
      ]),
    ])

    const links = await prisma().public_figure_occupations.findMany({
      where: { public_figure_id: figureId },
      orderBy: { is_current: 'desc' },
    })
    expect(links.map((l) => [l.occupation_id, l.is_current])).toEqual([
      [occupationIds[1], true],
      [occupationIds[0], false],
    ])
  })

  it('adds a membership with its period, then removes it', async () => {
    await append(4, [
      membershipAdded({
        membershipId,
        organisationId,
        role: 'Porte-parole',
        startedOn: new Date('2020-05-01'),
      }),
    ])
    const row = await prisma().organisation_memberships.findUniqueOrThrow({
      where: { id: membershipId },
    })
    expect(row).toMatchObject({
      public_figure_id: figureId,
      organisation_id: organisationId,
      role: 'Porte-parole',
      ended_on: null,
      created_by: actorId,
      updated_by: actorId,
    })
    expect(row.started_on?.toISOString().slice(0, 10)).toBe('2020-05-01')

    await append(5, [membershipRemoved(membershipId)])
    const gone = await prisma().organisation_memberships.findUnique({ where: { id: membershipId } })
    expect(gone).toBeNull()
  })

  it('rebuilds from the journal what the tables hold', async () => {
    const history = await Effect.runPromise(runUnitOfWork((journal) => journal.load(stream)))
    const state = replayPublicFigure(history)
    expect(Either.isRight(state) && state.right).toMatchObject({
      figure: { slug: 'personnalite-renommee', websiteUrl: Option.some('https://example.org') },
      occupations: [
        { occupationId: occupationIds[0], current: false },
        { occupationId: occupationIds[1], current: true },
      ],
      memberships: [],
    })
  })
})

describe.skipIf(!hasDatabase)('public figure journal after the backfill', () => {
  afterAll(() => prisma().$disconnect())

  it('holds a stream for every public figure in the table', async () => {
    const orphans = await prisma().$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count FROM public_figures f
      WHERE NOT EXISTS (
        SELECT 1 FROM domain_events e WHERE e.stream_type = 'public_figure' AND e.stream_id = f.id
      )`
    expect(Number(orphans[0].count)).toBe(0)
  })

  it('decodes every public figure event the backfill wrote', async () => {
    const events = await prisma().domain_events.findMany({
      where: { stream_type: 'public_figure' },
    })
    const unreadable = events
      .map((row) =>
        decodePublicFigureEvent({
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

  it('replays the figures with occupations or memberships to what their rows hold', async () => {
    const rows = await prisma().public_figures.findMany({
      where: {
        deleted_at: null,
        OR: [
          { public_figure_occupations: { some: {} } },
          { organisation_memberships: { some: {} } },
        ],
      },
      include: {
        public_figure_occupations: { select: { occupation_id: true, is_current: true } },
        organisation_memberships: { select: { id: true, organisation_id: true, role: true } },
      },
    })
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      const history = await Effect.runPromise(
        runUnitOfWork((journal) => journal.load(publicFigureStream(row.id))),
      )
      const state = replayPublicFigure(history)
      if (Either.isLeft(state) || !state.right) throw new Error(`No state for figure ${row.id}`)
      expect(state.right.figure).toMatchObject({
        name: row.name,
        slug: row.slug,
        createdBy: row.created_by,
      })
      const byId = (a: { occupationId: string }, b: { occupationId: string }) =>
        a.occupationId.localeCompare(b.occupationId)
      expect([...state.right.occupations].sort(byId)).toEqual(
        row.public_figure_occupations
          .map((o) => ({ occupationId: o.occupation_id, current: o.is_current }))
          .sort(byId),
      )
      expect(state.right.memberships.map((m) => m.id).sort()).toEqual(
        row.organisation_memberships.map((m) => m.id).sort(),
      )
    }
  })
})
