import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Effect, Either } from 'effect'
import {
  statementAdded,
  statementEdited,
  replayStatement,
  statementStream,
} from '../../domain/aggregates/statement'
import { decodeStatementEvent } from '../../domain/aggregates/statement-events'
import { argumentAdded, argumentStream } from '../../domain/aggregates/argument'
import {
  actContent,
  declarationContent,
  publicFigureAuthor,
  voteContent,
} from '../../domain/entities/statement'
import { toStatementContent } from '../database/statement-content-columns'
import { getPrismaClient } from '../prisma/client'
import { runUnitOfWork } from './unit-of-work'

/**
 * Runs against the local database (`npm run test:db`), on rows the seed
 * provides: a position, a public figure and a contributor. The two arguments
 * are its own, opened through the journal, so that no other suite can take
 * them away meanwhile.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const prisma = () => getPrismaClient()

const streamId = crypto.randomUUID()
const stream = statementStream(streamId)
let positionId = ''
let subjectId = ''
let figureId = ''
let actorId = ''
const argumentIds = [crypto.randomUUID(), crypto.randomUUID()]

describe.skipIf(!hasDatabase)('statement projector', () => {
  beforeAll(async () => {
    const position = await prisma().positions.findFirstOrThrow({
      select: { id: true, subject_id: true },
    })
    positionId = position.id
    subjectId = position.subject_id
    figureId = (await prisma().public_figures.findFirstOrThrow({ select: { id: true } })).id
    actorId = (await prisma().contributors.findFirstOrThrow({ select: { id: true } })).id
    for (const argumentId of argumentIds) {
      await Effect.runPromise(
        runUnitOfWork((journal) =>
          journal.append(
            argumentStream(argumentId),
            0,
            [argumentAdded({ title: `Argument de test ${argumentId}`, description: '' })],
            { actorId },
          ),
        ),
      )
    }
  })

  afterAll(async () => {
    await prisma().statements.deleteMany({ where: { id: streamId } })
    await prisma().arguments.deleteMany({ where: { id: { in: argumentIds } } })
    await prisma().domain_events.deleteMany({
      where: {
        OR: [
          { stream_type: 'statement', stream_id: streamId },
          { stream_type: 'argument', stream_id: { in: argumentIds } },
        ],
      },
    })
    await prisma().$disconnect()
  })

  it('writes the statement and its argument links when it is added', async () => {
    const added = statementAdded({
      author: publicFigureAuthor(figureId),
      subjectId,
      positionId,
      content: declarationContent('Une citation suffisamment longue pour être valide.'),
      sourceName: 'Le Monde',
      sourceUrl: 'https://lemonde.fr/article',
      statedAt: new Date('2024-01-15'),
      argumentIds: argumentIds.slice(0, 1),
    })

    await Effect.runPromise(
      runUnitOfWork((events) => events.append(stream, 0, [added], { actorId })),
    )

    const row = await prisma().statements.findUniqueOrThrow({
      where: { id: streamId },
      include: { argument_statements: true },
    })
    expect(row).toMatchObject({
      public_figure_id: figureId,
      organisation_id: null,
      position_id: positionId,
      source_url: 'https://lemonde.fr/article',
      statement_type: 'declaration',
      quote: 'Une citation suffisamment longue pour être valide.',
      voted_text: null,
      vote_choice: null,
      deed: null,
      document_name: null,
      created_by: actorId,
    })
    expect(row.stated_at.toISOString().slice(0, 10)).toBe('2024-01-15')
    expect(row.argument_statements.map((l) => l.argument_id)).toEqual(argumentIds.slice(0, 1))
  })

  it('updates the row and replaces the links when it is edited', async () => {
    const edited = statementEdited({
      positionId,
      content: voteContent('Proposition de loi sur la fin de vie', 'contre'),
      sourceName: 'Assemblée nationale',
      sourceUrl: 'https://www.assemblee-nationale.fr/scrutin',
      statedAt: new Date('2024-02-01'),
      argumentIds: argumentIds.slice(1, 2),
    })

    await Effect.runPromise(
      runUnitOfWork((events) => events.append(stream, 1, [edited], { actorId })),
    )

    const row = await prisma().statements.findUniqueOrThrow({
      where: { id: streamId },
      include: { argument_statements: true },
    })
    // Editing into a vote clears the words the declaration carried
    expect(row).toMatchObject({
      statement_type: 'vote',
      voted_text: 'Proposition de loi sur la fin de vie',
      vote_choice: 'contre',
      quote: null,
      source_url: 'https://www.assemblee-nationale.fr/scrutin',
      created_by: actorId,
    })
    expect(row.argument_statements.map((l) => l.argument_id)).toEqual(argumentIds.slice(1, 2))
  })

  it('rebuilds from the journal exactly what the table holds', async () => {
    const history = await Effect.runPromise(runUnitOfWork((events) => events.load(stream)))
    const state = replayStatement(history)
    const row = await prisma().statements.findUniqueOrThrow({ where: { id: streamId } })

    expect(Either.isRight(state) && state.right?.statement).toMatchObject({
      content: toStatementContent(row),
      sourceName: row.source_name,
      positionId: row.position_id,
      createdBy: row.created_by,
    })
  })

  it('soft-deletes the row when the statement is deleted', async () => {
    await Effect.runPromise(
      runUnitOfWork((events) =>
        events.append(stream, 2, [{ type: 'StatementDeleted', payload: {} }], { actorId }),
      ),
    )
    const row = await prisma().statements.findUniqueOrThrow({ where: { id: streamId } })
    expect(row.deleted_at).not.toBeNull()
  })

  it('leaves nothing behind when a later command fails', async () => {
    const result = await Effect.runPromise(
      Effect.either(
        runUnitOfWork((events) =>
          Effect.flatMap(
            events.append(
              stream,
              3,
              [
                statementEdited({
                  positionId,
                  content: actContent('Cosignature de la proposition de loi'),
                  sourceName: 'X',
                  sourceUrl: 'https://example.org/x',
                  statedAt: new Date(),
                  argumentIds: [],
                }),
              ],
              { actorId },
            ),
            () => Effect.fail('business rule broken'),
          ),
        ),
      ),
    )
    expect(Either.isLeft(result)).toBe(true)
    const row = await prisma().statements.findUniqueOrThrow({ where: { id: streamId } })
    expect(row.statement_type).toBe('vote')
  })
})

describe.skipIf(!hasDatabase)('statement journal after the backfill', () => {
  afterAll(() => prisma().$disconnect())

  it('holds a stream for every statement in the table', async () => {
    const orphans = await prisma().$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count FROM statements s
      WHERE NOT EXISTS (
        SELECT 1 FROM domain_events e WHERE e.stream_type = 'statement' AND e.stream_id = s.id
      )`
    expect(Number(orphans[0].count)).toBe(0)
  })

  it('decodes every statement event the backfill wrote', async () => {
    const events = await prisma().domain_events.findMany({ where: { stream_type: 'statement' } })
    const unreadable = events
      .map((row) =>
        decodeStatementEvent({
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

  it('replays a few backfilled streams to what their rows hold', async () => {
    const rows = await prisma().statements.findMany({
      take: 25,
      orderBy: { created_at: 'asc' },
      include: { argument_statements: { select: { argument_id: true } } },
    })
    for (const row of rows) {
      const history = await Effect.runPromise(
        runUnitOfWork((events) => events.load(statementStream(row.id))),
      )
      const state = replayStatement(history)
      expect(Either.isRight(state) && state.right).toMatchObject({
        statement: {
          content: toStatementContent(row),
          sourceName: row.source_name,
          sourceUrl: row.source_url,
          positionId: row.position_id,
          createdBy: row.created_by ?? undefined,
        },
        argumentIds: row.argument_statements.map((l) => l.argument_id),
      })
    }
  })
})
