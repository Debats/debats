import { Effect } from 'effect'
import {
  membershipAdded,
  publicFigureAdded,
  publicFigureStream,
} from '../../domain/aggregates/public-figure'
import { statementAdded, statementStream } from '../../domain/aggregates/statement'
import { positionAdded, subjectAdded, subjectStream } from '../../domain/aggregates/subject'
import { declarationContent, publicFigureAuthor } from '../../domain/entities/statement'
import { getPrismaClient } from '../prisma/client'
import { runUnitOfWork } from './unit-of-work'

/**
 * What a test against the database writes, written as a command would: through
 * the journal. A row inserted straight into a table has no stream, and the
 * tests that check every row has one fail while it is there.
 */

/** A public figure of a test, affiliated to these organisations — `endedOn` for an affiliation that ended */
export async function addTestFigure(
  actorId: string,
  name: string,
  affiliations: ReadonlyArray<{ organisationId: string; endedOn?: Date }> = [],
): Promise<string> {
  const figureId = crypto.randomUUID()
  await Effect.runPromise(
    runUnitOfWork((journal) =>
      journal.append(
        publicFigureStream(figureId),
        0,
        [
          publicFigureAdded({
            name,
            presentation: 'Une présentation suffisamment longue.',
            notorietySources: [],
          }),
          ...affiliations.map(({ organisationId, endedOn }) =>
            membershipAdded({ membershipId: crypto.randomUUID(), organisationId, endedOn }),
          ),
        ],
        { actorId },
      ),
    ),
  )
  return figureId
}

/** A subject of a test, with one position */
export async function addTestSubject(
  actorId: string,
  title: string,
): Promise<{ subjectId: string; positionId: string }> {
  const subjectId = crypto.randomUUID()
  const positionId = crypto.randomUUID()
  await Effect.runPromise(
    runUnitOfWork((journal) =>
      journal.append(
        subjectStream(subjectId),
        0,
        [
          subjectAdded({
            title,
            presentation: 'Une présentation suffisamment longue.',
            problem: 'Une problématique suffisamment longue ?',
          }),
          positionAdded({
            positionId,
            title: `Position de ${title}`,
            description: 'Une description suffisamment longue.',
          }),
        ],
        { actorId },
      ),
    ),
  )
  return { subjectId, positionId }
}

/** A declaration of a public figure, for a position of a subject */
export async function addTestStatement(
  actorId: string,
  stated: {
    figureId: string
    subjectId: string
    positionId: string
    statedAt: Date
    sourceName: string
    sourceUrl: string
  },
): Promise<string> {
  const statementId = crypto.randomUUID()
  await Effect.runPromise(
    runUnitOfWork((journal) =>
      journal.append(
        statementStream(statementId),
        0,
        [
          statementAdded({
            author: publicFigureAuthor(stated.figureId),
            subjectId: stated.subjectId,
            positionId: stated.positionId,
            content: declarationContent('Les mots qui énoncent la position.'),
            sourceName: stated.sourceName,
            sourceUrl: stated.sourceUrl,
            statedAt: stated.statedAt,
            argumentIds: [],
          }),
        ],
        { actorId },
      ),
    ),
  )
  return statementId
}

/**
 * Takes away what a test wrote, rows and streams. Positions go with their
 * subject, statements with their position or their author, affiliations with
 * their public figure.
 */
export async function removeTestWrites(written: {
  statementIds?: string[]
  subjectIds?: string[]
  figureIds?: string[]
}): Promise<void> {
  const prisma = getPrismaClient()
  const statementIds = written.statementIds ?? []
  const subjectIds = written.subjectIds ?? []
  const figureIds = written.figureIds ?? []
  await prisma.statements.deleteMany({ where: { id: { in: statementIds } } })
  await prisma.subjects.deleteMany({ where: { id: { in: subjectIds } } })
  await prisma.public_figures.deleteMany({ where: { id: { in: figureIds } } })
  await prisma.domain_events.deleteMany({
    where: {
      OR: [
        { stream_type: 'statement', stream_id: { in: statementIds } },
        { stream_type: 'subject', stream_id: { in: subjectIds } },
        { stream_type: 'public_figure', stream_id: { in: figureIds } },
      ],
    },
  })
}
