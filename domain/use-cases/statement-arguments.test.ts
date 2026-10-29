import { describe, it, expect } from 'vitest'
import { Effect, Either } from 'effect'
import {
  argumentRewards,
  recordProposedArguments,
  validateStatementArguments,
} from './statement-arguments'
import { fakeArgumentRepo, sampleArgument } from './argument-test-helpers'
import { createInMemoryEventStore } from '../events/event-store-memory'
import { ArgumentRepository } from '../repositories/argument-repository'
import { ContributorIdentity } from './types'
import { StatementArgumentsInput } from './statement-arguments'

const eloquent = { id: 'contributor-1', reputation: 1000 }
const meteque = { id: 'contributor-2', reputation: 10 }

const proposed = {
  title: 'Liberté de choix',
  description: 'Chacun doit pouvoir décider pour lui-même en fin de vie.',
}

const validate = (params: {
  contributor: ContributorIdentity
  input: StatementArgumentsInput
  argumentRepo: ArgumentRepository
}) =>
  Effect.runPromise(
    Effect.either(
      Effect.provideService(
        validateStatementArguments(params.contributor, params.input),
        ArgumentRepository,
        params.argumentRepo,
      ),
    ),
  )

describe('validateStatementArguments', () => {
  it('accepts an empty selection from anyone', async () => {
    const result = await validate({
      contributor: meteque,
      input: { argumentIds: [], newArguments: [] },
      argumentRepo: fakeArgumentRepo(),
    })

    expect(result).toEqual(Either.right({ existingIds: [], toCreate: [] }))
  })

  it('requires the Éloquent rank as soon as an argument is involved', async () => {
    const existing = sampleArgument()
    const result = await validate({
      contributor: meteque,
      input: { argumentIds: [existing.id], newArguments: [] },
      argumentRepo: fakeArgumentRepo([existing]),
    })

    expect(Either.isLeft(result) && result.left).toMatchObject({
      _tag: 'Rejected',
      message: expect.stringContaining('Éloquent'),
    })
  })

  it('refuses an argument that no longer exists', async () => {
    const result = await validate({
      contributor: eloquent,
      input: { argumentIds: ['gone'], newArguments: [] },
      argumentRepo: fakeArgumentRepo(),
    })

    expect(Either.isLeft(result) && result.left).toMatchObject({
      message: expect.stringContaining('existe plus'),
    })
  })

  it('blames a malformed proposal on the arguments field', async () => {
    const result = await validate({
      contributor: eloquent,
      input: { argumentIds: [], newArguments: [{ title: 'Ok', description: '' }] },
      argumentRepo: fakeArgumentRepo(),
    })

    expect(Either.isLeft(result) && result.left).toMatchObject({ field: 'arguments' })
  })

  it('reuses an existing argument when a proposal has the same title', async () => {
    const existing = sampleArgument('Liberté de choix')
    const result = await validate({
      contributor: eloquent,
      input: { argumentIds: [], newArguments: [{ ...proposed, title: ' liberté de CHOIX ' }] },
      argumentRepo: fakeArgumentRepo([existing]),
    })

    expect(result).toEqual(Either.right({ existingIds: [existing.id], toCreate: [] }))
  })

  it('keeps one proposal per title and the chosen arguments once', async () => {
    const existing = sampleArgument()
    const result = await validate({
      contributor: eloquent,
      input: {
        argumentIds: [existing.id, existing.id],
        newArguments: [proposed, { ...proposed, title: proposed.title.toUpperCase() }],
      },
      argumentRepo: fakeArgumentRepo([existing]),
    })

    expect(result).toEqual(Either.right({ existingIds: [existing.id], toCreate: [proposed] }))
  })
})

describe('recordProposedArguments', () => {
  it('opens a stream per proposal and returns every argument to mobilise', async () => {
    const existing = sampleArgument()
    const journal = createInMemoryEventStore()

    const recorded = await Effect.runPromise(
      recordProposedArguments(journal, 'contributor-1', {
        existingIds: [existing.id],
        toCreate: [proposed],
      }),
    )

    expect(journal.all()).toMatchObject([
      {
        streamType: 'argument',
        revision: 1,
        type: 'ArgumentAdded',
        actorId: 'contributor-1',
        payload: { title: 'Liberté de choix', slug: 'liberte-de-choix' },
      },
    ])
    expect(recorded).toEqual({
      argumentIds: [existing.id, journal.all()[0].streamId],
      createdIds: [journal.all()[0].streamId],
    })
  })
})

describe('argumentRewards', () => {
  it('rewards each proposal, then each argument the statement mobilises', () => {
    const rewards = argumentRewards('contributor-1', { argumentIds: ['a', 'b'], createdIds: ['b'] })

    expect(rewards.map((r) => [r.action, r.amount, r.relatedEntityId])).toEqual([
      ['added_argument_validated', 50, 'b'],
      ['linked_argument_to_statement', 1, 'a'],
      ['linked_argument_to_statement', 1, 'b'],
    ])
    expect(rewards.every((r) => r.contributorId === 'contributor-1')).toBe(true)
  })
})
