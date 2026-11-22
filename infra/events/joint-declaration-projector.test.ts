import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Effect, Either } from 'effect'
import {
  jointDeclarationPublished,
  jointDeclarationStream,
  positionTaken,
  replayJointDeclaration,
  signatoryAdded,
  signatoryWithdrawn,
  signatureOf,
  subjectDisengaged,
  takenPositionMerged,
} from '../../domain/aggregates/joint-declaration'
import { JointDeclarationEvent } from '../../domain/aggregates/joint-declaration-events'
import { statementAdded, statementStream } from '../../domain/aggregates/statement'
import { organisationAuthor, publicFigureAuthor } from '../../domain/entities/statement'
import { UniqueTaken } from '../../domain/events/event-store'
import { getPrismaClient } from '../prisma/client'
import { runUnitOfWork } from './unit-of-work'

/**
 * Runs against the local database (`npm run test:db`), on rows the seed
 * provides: a position, a public figure, an organisation and a contributor.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const prisma = () => getPrismaClient()

const declarationId = crypto.randomUUID()
const statementId = crypto.randomUUID()
const stream = jointDeclarationStream(declarationId)
const title = `Tribune de test ${declarationId.slice(0, 8)}`
const published = jointDeclarationPublished({
  title,
  presentation: 'Pour le test.',
  sourceName: 'Le Monde',
  sourceUrl: `https://example.org/tribune-${declarationId}`,
  declaredAt: new Date('2026-11-21'),
})
let taken = { subjectId: '', positionId: '', quote: 'Les mots du texte qui énoncent la position.' }
let figureId = ''
let organisationId = ''
let actorId = ''

const append = (revision: number, events: JointDeclarationEvent[]) =>
  Effect.runPromise(
    runUnitOfWork((journal) => journal.append(stream, revision, events, { actorId })),
  )

describe.skipIf(!hasDatabase)('joint declaration projector', () => {
  beforeAll(async () => {
    // A subject with at least two positions: one is merged into the other further down
    const subject = await prisma().positions.groupBy({
      by: ['subject_id'],
      where: { deleted_at: null },
      having: { subject_id: { _count: { gt: 1 } } },
      take: 1,
      orderBy: { subject_id: 'asc' },
    })
    const position = await prisma().positions.findFirstOrThrow({
      where: { deleted_at: null, subject_id: subject[0].subject_id },
      select: { id: true, subject_id: true },
    })
    taken = { ...taken, subjectId: position.subject_id, positionId: position.id }
    figureId = (await prisma().public_figures.findFirstOrThrow({ select: { id: true } })).id
    organisationId = (await prisma().organisations.findFirstOrThrow({ select: { id: true } })).id
    actorId = (await prisma().contributors.findFirstOrThrow({ select: { id: true } })).id
  })

  afterAll(async () => {
    await prisma().statements.deleteMany({ where: { id: statementId } })
    await prisma().joint_declarations.deleteMany({ where: { id: declarationId } })
    await prisma().domain_events.deleteMany({
      where: {
        OR: [
          { stream_type: 'joint_declaration', stream_id: declarationId },
          { stream_type: 'statement', stream_id: statementId },
        ],
      },
    })
    await prisma().$disconnect()
  })

  it('writes the text, signed and dated as the event', async () => {
    await append(0, [published])

    const row = await prisma().joint_declarations.findUniqueOrThrow({
      where: { id: declarationId },
    })
    expect(row).toMatchObject({
      title,
      slug: `tribune-de-test-${declarationId.slice(0, 8)}`,
      presentation: 'Pour le test.',
      source_name: 'Le Monde',
      declared_at: new Date('2026-11-21'),
      created_by: actorId,
      updated_by: actorId,
    })
  })

  it('reports a title another joint declaration took meanwhile as a value taken', async () => {
    const twin = jointDeclarationStream(crypto.randomUUID())
    const outcome = await Effect.runPromise(
      Effect.either(runUnitOfWork((journal) => journal.append(twin, 0, [published], { actorId }))),
    )

    expect(Either.isLeft(outcome) && outcome.left).toBeInstanceOf(UniqueTaken)
    expect(Either.isLeft(outcome) && (outcome.left as UniqueTaken).constraint).toBe(
      'joint_declarations_slug_key',
    )
  })

  it('writes the positions the text takes and who signed it, in the order they came', async () => {
    await append(1, [
      positionTaken(taken),
      signatoryAdded(publicFigureAuthor(figureId)),
      signatoryAdded(organisationAuthor(organisationId)),
    ])

    const positions = await prisma().joint_declaration_positions.findMany({
      where: { joint_declaration_id: declarationId },
    })
    expect(positions).toMatchObject([
      {
        subject_id: taken.subjectId,
        position_id: taken.positionId,
        quote: taken.quote,
        rank: 1,
        created_by: actorId,
      },
    ])
    const signatories = await prisma().joint_declaration_signatories.findMany({
      where: { joint_declaration_id: declarationId },
      orderBy: { rank: 'asc' },
    })
    expect(signatories).toMatchObject([
      { public_figure_id: figureId, organisation_id: null, rank: 1 },
      { public_figure_id: null, organisation_id: organisationId, rank: 2 },
    ])
  })

  it('follows a position merged into another, then lets go of a subject that leaves the site', async () => {
    const other = await prisma().positions.findFirstOrThrow({
      where: { subject_id: taken.subjectId, id: { not: taken.positionId } },
      select: { id: true },
    })
    await append(4, [takenPositionMerged(taken.positionId, other.id)])
    expect(
      await prisma().joint_declaration_positions.findMany({
        where: { joint_declaration_id: declarationId },
        select: { position_id: true, quote: true },
      }),
    ).toEqual([{ position_id: other.id, quote: taken.quote }])

    await append(5, [takenPositionMerged(other.id, taken.positionId)])
    await append(6, [subjectDisengaged(taken.subjectId)])
    expect(
      await prisma().joint_declaration_positions.count({
        where: { joint_declaration_id: declarationId },
      }),
    ).toBe(0)

    // The text takes the position again, for the test that follows
    await append(7, [positionTaken(taken)])
  })

  it('lets go of a signatory withdrawn, and ranks who signs next after the last, never beside them', async () => {
    await append(8, [signatoryWithdrawn(publicFigureAuthor(figureId))])
    expect(
      await prisma().joint_declaration_signatories.findMany({
        where: { joint_declaration_id: declarationId },
        select: { public_figure_id: true, organisation_id: true, rank: true },
      }),
    ).toEqual([{ public_figure_id: null, organisation_id: organisationId, rank: 2 }])

    // Found to have signed after all
    await append(9, [signatoryAdded(publicFigureAuthor(figureId))])
    expect(
      await prisma().joint_declaration_signatories.findMany({
        where: { joint_declaration_id: declarationId },
        select: { public_figure_id: true, rank: true },
        orderBy: { rank: 'asc' },
      }),
    ).toEqual([
      { public_figure_id: null, rank: 2 },
      { public_figure_id: figureId, rank: 3 },
    ])
  })

  it('names the joint declaration on the statement a signature makes', async () => {
    const history = await Effect.runPromise(runUnitOfWork((journal) => journal.load(stream)))
    const state = replayJointDeclaration(history)
    if (Either.isLeft(state) || !state.right) throw new Error('expected a state')

    await Effect.runPromise(
      runUnitOfWork((journal) =>
        journal.append(
          statementStream(statementId),
          0,
          [statementAdded(signatureOf(state.right!, publicFigureAuthor(figureId), taken))],
          { actorId },
        ),
      ),
    )

    const row = await prisma().statements.findUniqueOrThrow({ where: { id: statementId } })
    expect(row).toMatchObject({
      joint_declaration_id: declarationId,
      position_id: taken.positionId,
      public_figure_id: figureId,
      statement_type: 'declaration',
      quote: taken.quote,
      source_name: 'Le Monde',
      stated_at: new Date('2026-11-21'),
    })
  })
})
