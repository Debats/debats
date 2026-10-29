import { describe, it, expect } from 'vitest'
import { Effect, Either, Layer } from 'effect'
import { renameArgumentUseCase } from './rename-argument'
import { mergeArgumentsUseCase } from './merge-arguments'
import {
  fakeArgumentRepo,
  fakeArgumentSource,
  journalWithArguments,
  sampleArgument,
} from './argument-test-helpers'
import { fakeStatementSource } from './subject-test-helpers'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { RunUnitOfWork } from '../events/unit-of-work'
import { EDITED_MEANWHILE } from './run-command'
import { addStatement, statementStream } from '../aggregates/statement'
import { publicFigureAuthor, Statement, StatementId } from '../entities/statement'
import { ArgumentRepository } from '../repositories/argument-repository'
import { StatementRepository } from '../repositories/statement-repository'
import { Argument } from '../entities/argument'
import { runFormWith, runWith } from './command-test-helpers'
import { ArgumentSource } from './argument-stream'
import { StatementParts, StatementSource } from './statement-stream'

const idealiste = { id: 'contributor-1', reputation: 10000 }
const eloquent = { id: 'contributor-2', reputation: 1000 }

const renameParams = (argumentId: string) => ({
  contributor: idealiste,
  argumentId,
  title: 'Coût pour les finances publiques',
  description: '',
  revision: 0,
})

/** The tables as the test wants them: the arguments the site knows */
const argumentsKnown = (seed: Argument[]) =>
  Layer.mergeAll(
    Layer.succeed(ArgumentSource, fakeArgumentSource(seed)),
    Layer.succeed(ArgumentRepository, fakeArgumentRepo(seed)),
  )

describe('renameArgumentUseCase', () => {
  it('requires the Idéaliste rank', async () => {
    const argument = sampleArgument()
    const result = await runFormWith(argumentsKnown([argument]))(
      renameArgumentUseCase({ ...renameParams(argument.id), contributor: eloquent }),
    )

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('refuses a title another argument already bears', async () => {
    const argument = sampleArgument()
    const result = await runFormWith(
      argumentsKnown([argument, sampleArgument('Liberté de choix')]),
    )(renameArgumentUseCase({ ...renameParams(argument.id), title: 'liberté de choix' }))

    expect(Either.isLeft(result) && typeof result.left !== 'string' && result.left.title).toContain(
      'fusionnez',
    )
  })

  it('records the renaming in the stream and moves the slug', async () => {
    const argument = sampleArgument()
    const unit = await journalWithArguments(argument)
    const result = await runFormWith(argumentsKnown([argument]))(
      renameArgumentUseCase({ ...renameParams(argument.id), description: 'Nouvelle description.' }),
      unit.run,
    )

    expect(Either.isRight(result) && result.right).toMatchObject({
      id: argument.id,
      slug: 'cout-pour-les-finances-publiques',
      description: 'Nouvelle description.',
      updatedBy: 'contributor-1',
    })
    expect(unit.journal.all().map((e) => [e.type, e.revision])).toEqual([
      ['ArgumentAdded', 1],
      ['ArgumentRenamed', 2],
    ])
  })

  it('imports an argument the journal does not know yet, then renames it', async () => {
    const argument = sampleArgument()
    const unit = inMemoryUnitOfWork()
    const result = await runFormWith(argumentsKnown([argument]))(
      renameArgumentUseCase(renameParams(argument.id)),
      unit.run,
    )

    expect(Either.isRight(result)).toBe(true)
    expect(unit.journal.all().map((e) => e.type)).toEqual(['ArgumentImported', 'ArgumentRenamed'])
  })
})

const statementOn = (id: string): Statement =>
  Statement.make({
    id: StatementId.make(id),
    author: publicFigureAuthor('figure-1'),
    positionId: 'pos-1',
    statementType: 'declaration',
    sourceName: 'Le Monde',
    sourceUrl: 'https://lemonde.fr/article',
    quote: 'Une citation suffisamment longue pour être valide.',
    statedAt: new Date('2024-01-15'),
    createdBy: 'author-id',
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16'),
  })

const statementRepoOf = (ids: string[]) =>
  ({ findIdsByArgumentId: () => Effect.succeed(ids) }) as unknown as StatementRepository

describe('mergeArgumentsUseCase', () => {
  const [a, b] = [sampleArgument('Coût budgétaire'), sampleArgument('Coût pour l’État')]
  const mergeParams = {
    contributor: idealiste,
    sourceArgumentId: a.id,
    targetArgumentId: b.id,
  }
  /** The tables as the test wants them: which statements mobilise the source, and what they hold */
  const fakes = (statementIds: string[] = [], statementsInTables: StatementParts[] = []) =>
    Layer.mergeAll(
      Layer.succeed(ArgumentSource, fakeArgumentSource([a, b])),
      Layer.succeed(StatementSource, fakeStatementSource(statementsInTables)),
      Layer.succeed(StatementRepository, statementRepoOf(statementIds)),
    )
  const execute = runWith(fakes())

  it('requires the Idéaliste rank', async () => {
    const result = await execute(mergeArgumentsUseCase({ ...mergeParams, contributor: eloquent }))

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('refuses to merge an argument into itself', async () => {
    const result = await execute(mergeArgumentsUseCase({ ...mergeParams, targetArgumentId: a.id }))

    expect(Either.isLeft(result) && result.left).toContain('lui-même')
  })

  it('refuses an argument nobody knows', async () => {
    const result = await execute(
      mergeArgumentsUseCase({ ...mergeParams, targetArgumentId: 'gone' }),
    )

    expect(Either.isLeft(result) && result.left).toContain('introuvable')
  })

  it('records the merge on the source and moves each statement to the target', async () => {
    const unit = await journalWithArguments(a, b)
    await Effect.runPromise(
      unit.journal.append(
        statementStream('s-1'),
        0,
        [
          addStatement({
            ...statementOn('s-1'),
            subjectId: 'subject-1',
            argumentIds: [a.id, 'other'],
          }),
        ],
        { actorId: 'author-id' },
      ),
    )
    const result = await runWith(
      fakes(
        ['s-1', 's-2', 's-3'],
        [
          { statement: statementOn('s-2'), argumentIds: [a.id, b.id], subjectId: 'subject-1' },
          { statement: statementOn('s-3'), argumentIds: ['other'], subjectId: 'subject-1' },
        ],
      ),
    )(mergeArgumentsUseCase(mergeParams), unit.run)

    expect(Either.isRight(result) && result.right.id).toBe(b.id)
    const events = unit.journal.all().slice(3)
    expect(events.map((e) => [e.streamType, e.streamId, e.type, e.payload])).toEqual([
      // The statements the journal does not know yet enter it before the transaction
      ['statement', 's-2', 'StatementImported', expect.anything()],
      ['statement', 's-3', 'StatementImported', expect.anything()],
      ['argument', b.id, 'ArgumentAbsorbed', { sourceArgumentId: a.id }],
      ['argument', a.id, 'ArgumentMergedInto', { targetArgumentId: b.id }],
      ['statement', 's-1', 'StatementArgumentsSet', { argumentIds: ['other', b.id] }],
      ['statement', 's-2', 'StatementArgumentsSet', { argumentIds: [b.id] }],
      // s-3 dropped the source meanwhile: imported to decide, nothing to change
    ])
  })

  it('refuses to merge an argument already merged away, as it would any deleted one', async () => {
    const unit = await journalWithArguments(a, b)
    await execute(mergeArgumentsUseCase(mergeParams), unit.run)
    const result = await execute(mergeArgumentsUseCase(mergeParams), unit.run)

    expect(Either.isLeft(result) && result.left).toContain('introuvable')
  })

  it('refuses when a crossing merge took the target meanwhile: the target writes too', async () => {
    const unit = await journalWithArguments(a, b)
    const crossing = async () => {
      await execute(
        mergeArgumentsUseCase({ ...mergeParams, sourceArgumentId: b.id, targetArgumentId: a.id }),
        unit.run,
      )
    }
    // The crossing merge lands between this one's load of the target and its append on it
    const raced: RunUnitOfWork = (work) =>
      unit.run((events) =>
        work({
          ...events,
          append: (stream, expectedRevision, decided, options) =>
            stream.streamId === b.id
              ? Effect.andThen(
                  Effect.promise(crossing),
                  events.append(stream, expectedRevision, decided, options),
                )
              : events.append(stream, expectedRevision, decided, options),
        }),
      )

    const result = await execute(mergeArgumentsUseCase(mergeParams), raced)

    expect(result).toEqual(Either.left(EDITED_MEANWHILE))
    // The in-memory rollback forgets the crossing writer too: only our own absence is observable
    const ours = unit.journal.all().filter((e) => e.streamId === a.id)
    expect(ours.map((e) => e.type)).toEqual(['ArgumentAdded'])
  })

  it('refuses a target already merged away', async () => {
    const unit = await journalWithArguments(a, b)
    await execute(mergeArgumentsUseCase(mergeParams), unit.run)
    const result = await execute(
      mergeArgumentsUseCase({ ...mergeParams, sourceArgumentId: b.id, targetArgumentId: a.id }),
      unit.run,
    )

    expect(Either.isLeft(result) && result.left).toContain('existe plus')
  })
})
