import { describe, it, expect } from 'vitest'
import { Either, Effect, Layer } from 'effect'
import { deleteSubjectUseCase } from './delete-subject'
import { createStatement } from '../entities/entity-test-helpers'
import { declarationContent, publicFigureAuthor, Statement } from '../entities/statement'
import { Subject } from '../entities/subject'
import { SubjectRepository } from '../repositories/subject-repository'
import { StatementRepository } from '../repositories/statement-repository'
import { statementAdded, statementDeleted, statementStream } from '../aggregates/statement'
import { runWith } from './command-test-helpers'
import { journalWithSubjects, samplePosition, sampleSubject } from './subject-test-helpers'

const subject: Subject = { ...sampleSubject(), createdAt: new Date('2020-01-01') }
const position = samplePosition(subject.id)
const statement = createStatement({
  author: publicFigureAuthor('figure-1'),
  positionId: position.id,
  content: declarationContent('Une citation suffisamment longue pour être valide.'),
  sourceName: 'Le Monde',
  sourceUrl: 'https://lemonde.fr/article',
  statedAt: new Date('2024-01-15'),
  createdBy: 'author-id',
})

const subjectRepo = (statementsCount: number) =>
  ({
    findById: (id: string) => Effect.succeed(id === subject.id ? subject : null),
    getStats: () =>
      Effect.succeed({
        subjectId: subject.id,
        positionsCount: 1,
        statementsCount,
        figuresCount: 1,
      }),
  }) as unknown as SubjectRepository

const statementRepo = (statements: Statement[]) =>
  ({
    findIdsBySubjectId: () => Effect.succeed(statements.map((s) => s.id)),
  }) as unknown as StatementRepository

const validParams = { subjectId: subject.id }

/** The read side as the test wants it: how heavy the subject is, which statements stand on it */
const fakes = (statementsCount = 0, statements: Statement[] = []) =>
  Layer.mergeAll(
    Layer.succeed(SubjectRepository, subjectRepo(statementsCount)),
    Layer.succeed(StatementRepository, statementRepo(statements)),
  )

const execute = runWith(fakes())

describe('deleteSubjectUseCase', () => {
  it('should fail when contributor is null', async () => {
    const result = await execute(deleteSubjectUseCase({ ...validParams, contributor: null }))
    expect(Either.isLeft(result) && result.left).toContain('connecté')
  })

  it('skips a statement already deleted meanwhile instead of refusing the whole deletion', async () => {
    const { run, journal } = await journalWithSubjects([subject, [position]])
    await Effect.runPromise(
      journal.append(
        statementStream(statement.id),
        0,
        [
          statementAdded({ ...statement, subjectId: subject.id, argumentIds: [] }),
          statementDeleted(),
        ],
        { actorId: 'author-id' },
      ),
    )

    const result = await runWith(fakes(0, [statement]))(
      deleteSubjectUseCase({ ...validParams, contributor: { id: 'abc', reputation: 10000 } }),
      run,
    )

    expect(Either.isRight(result)).toBe(true)
    const deletions = journal.all().filter((e) => e.type === 'StatementDeleted')
    expect(deletions).toHaveLength(1)
  })

  it('should fail when subject does not exist', async () => {
    const result = await execute(
      deleteSubjectUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 1_000_000 },
        subjectId: 'missing',
      }),
    )
    expect(result).toEqual(Either.left('Sujet introuvable.'))
  })

  it('should fail when contributor lacks reputation for minor subject', async () => {
    const result = await execute(
      deleteSubjectUseCase({ ...validParams, contributor: { id: 'abc', reputation: 0 } }),
    )
    expect(Either.isLeft(result)).toBe(true)
  })

  it('should require Fondateur for major subject', async () => {
    const result = await runWith(fakes(50))(
      deleteSubjectUseCase({ ...validParams, contributor: { id: 'abc', reputation: 10000 } }),
    )
    expect(Either.isLeft(result) && result.left).toContain('Fondateur')
  })

  it('should delete a minor subject, and every statement on it, in one unit of work', async () => {
    const { run, journal } = await journalWithSubjects([subject, [position]])
    await Effect.runPromise(
      journal.append(
        statementStream(statement.id),
        0,
        [statementAdded({ ...statement, subjectId: subject.id, argumentIds: [] })],
        {
          actorId: 'author-id',
        },
      ),
    )

    const result = await runWith(fakes(0, [statement]))(
      deleteSubjectUseCase({ ...validParams, contributor: { id: 'abc', reputation: 10000 } }),
      run,
    )

    expect(Either.isRight(result)).toBe(true)
    expect(
      journal
        .all()
        .slice(-2)
        .map((e) => [e.streamType, e.type, e.actorId]),
    ).toEqual([
      ['subject', 'SubjectDeleted', 'abc'],
      ['statement', 'StatementDeleted', 'abc'],
    ])
  })
})
