import { describe, it, expect } from 'vitest'
import { Effect, Either } from 'effect'
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
import { addStatement, statementStream } from '../aggregates/statement'
import { publicFigureAuthor, Statement, StatementId } from '../entities/statement'
import { StatementRepository } from '../repositories/statement-repository'
import { Argument } from '../entities/argument'

const idealiste = { id: 'contributor-1', reputation: 10000 }
const eloquent = { id: 'contributor-2', reputation: 1000 }

const renameParams = (seed: Argument[], argumentId = seed[0].id) => ({
  contributor: idealiste,
  argumentId,
  title: 'Coût pour les finances publiques',
  description: '',
  runUnitOfWork: inMemoryUnitOfWork().run,
  argumentSource: fakeArgumentSource(seed),
  argumentRepo: fakeArgumentRepo(seed),
})

describe('renameArgumentUseCase', () => {
  it('requires the Idéaliste rank', async () => {
    const result = await renameArgumentUseCase({
      ...renameParams([sampleArgument()]),
      contributor: eloquent,
    })

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('refuses a title another argument already bears', async () => {
    const result = await renameArgumentUseCase({
      ...renameParams([sampleArgument(), sampleArgument('Liberté de choix')]),
      title: 'liberté de choix',
    })

    expect(Either.isLeft(result) && typeof result.left !== 'string' && result.left.title).toContain(
      'fusionnez',
    )
  })

  it('records the renaming in the stream and moves the slug', async () => {
    const argument = sampleArgument()
    const unit = await journalWithArguments(argument)
    const result = await renameArgumentUseCase({
      ...renameParams([argument]),
      description: 'Nouvelle description.',
      runUnitOfWork: unit.run,
    })

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
    const result = await renameArgumentUseCase({
      ...renameParams([argument]),
      runUnitOfWork: unit.run,
    })

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
  const mergeParams = (unit = inMemoryUnitOfWork(), statementIds: string[] = []) => ({
    contributor: idealiste,
    sourceArgumentId: a.id,
    targetArgumentId: b.id,
    runUnitOfWork: unit.run,
    argumentSource: fakeArgumentSource([a, b]),
    statementSource: fakeStatementSource([]),
    statementRepo: statementRepoOf(statementIds),
  })

  it('requires the Idéaliste rank', async () => {
    const result = await mergeArgumentsUseCase({ ...mergeParams(), contributor: eloquent })

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('refuses to merge an argument into itself', async () => {
    const result = await mergeArgumentsUseCase({ ...mergeParams(), targetArgumentId: a.id })

    expect(Either.isLeft(result) && result.left).toContain('lui-même')
  })

  it('refuses an argument nobody knows', async () => {
    const result = await mergeArgumentsUseCase({ ...mergeParams(), targetArgumentId: 'gone' })

    expect(Either.isLeft(result) && result.left).toContain('introuvable')
  })

  it('records the merge on the source and moves each statement to the target', async () => {
    const unit = await journalWithArguments(a, b)
    await Effect.runPromise(
      unit.journal.append(
        statementStream('s-1'),
        0,
        [addStatement({ ...statementOn('s-1'), argumentIds: [a.id, 'other'] })],
        { actorId: 'author-id' },
      ),
    )
    const result = await mergeArgumentsUseCase({
      ...mergeParams(unit, ['s-1', 's-2', 's-3']),
      statementSource: fakeStatementSource([
        { statement: statementOn('s-2'), argumentIds: [a.id, b.id] },
        { statement: statementOn('s-3'), argumentIds: ['other'] },
      ]),
    })

    expect(Either.isRight(result) && result.right.id).toBe(b.id)
    const events = unit.journal.all().slice(3)
    expect(events.map((e) => [e.streamType, e.streamId, e.type, e.payload])).toEqual([
      ['argument', a.id, 'ArgumentMergedInto', { targetArgumentId: b.id }],
      ['statement', 's-1', 'StatementArgumentsSet', { argumentIds: ['other', b.id] }],
      ['statement', 's-2', 'StatementImported', expect.anything()],
      ['statement', 's-2', 'StatementArgumentsSet', { argumentIds: [b.id] }],
      // s-3 dropped the source meanwhile: imported to decide, nothing to change
      ['statement', 's-3', 'StatementImported', expect.anything()],
    ])
  })

  it('refuses to merge an argument already merged away, as it would any deleted one', async () => {
    const unit = await journalWithArguments(a, b)
    await mergeArgumentsUseCase(mergeParams(unit))
    const result = await mergeArgumentsUseCase(mergeParams(unit))

    expect(Either.isLeft(result) && result.left).toContain('introuvable')
  })

  it('refuses a target already merged away', async () => {
    const unit = await journalWithArguments(a, b)
    await mergeArgumentsUseCase(mergeParams(unit))
    const result = await mergeArgumentsUseCase({
      ...mergeParams(unit),
      sourceArgumentId: b.id,
      targetArgumentId: a.id,
    })

    expect(Either.isLeft(result) && result.left).toContain('existe plus')
  })
})
