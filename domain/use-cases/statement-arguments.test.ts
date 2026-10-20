import { describe, it, expect } from 'vitest'
import { Effect, Either } from 'effect'
import {
  argumentRewards,
  recordProposedArguments,
  validateStatementArguments,
} from './statement-arguments'
import { fakeArgumentRepo, sampleArgument } from './argument-test-helpers'
import { createInMemoryEventStore } from '../events/event-store-memory'

const eloquent = { id: 'contributor-1', reputation: 1000 }
const meteque = { id: 'contributor-2', reputation: 10 }

const proposed = {
  title: 'Liberté de choix',
  description: 'Chacun doit pouvoir décider pour lui-même en fin de vie.',
}

describe('validateStatementArguments', () => {
  it('accepts an empty selection from anyone', async () => {
    const result = await validateStatementArguments({
      contributor: meteque,
      input: { argumentIds: [], newArguments: [] },
      argumentRepo: fakeArgumentRepo(),
    })

    expect(Either.isRight(result) && result.right).toEqual({ existingIds: [], toCreate: [] })
  })

  it('requires the Éloquent rank as soon as an argument is involved', async () => {
    const existing = sampleArgument()
    const result = await validateStatementArguments({
      contributor: meteque,
      input: { argumentIds: [existing.id], newArguments: [] },
      argumentRepo: fakeArgumentRepo([existing]),
    })

    expect(Either.isLeft(result) && result.left).toContain('Éloquent')
  })

  it('refuses an argument that no longer exists', async () => {
    const result = await validateStatementArguments({
      contributor: eloquent,
      input: { argumentIds: ['gone'], newArguments: [] },
      argumentRepo: fakeArgumentRepo(),
    })

    expect(Either.isLeft(result) && result.left).toContain('existe plus')
  })

  it('reports a malformed proposal as a field error', async () => {
    const result = await validateStatementArguments({
      contributor: eloquent,
      input: { argumentIds: [], newArguments: [{ title: 'Ok', description: '' }] },
      argumentRepo: fakeArgumentRepo(),
    })

    expect(
      Either.isLeft(result) && typeof result.left !== 'string' && result.left.arguments,
    ).toBeDefined()
  })

  it('reuses an existing argument when a proposal has the same title', async () => {
    const existing = sampleArgument('Liberté de choix')
    const result = await validateStatementArguments({
      contributor: eloquent,
      input: { argumentIds: [], newArguments: [{ ...proposed, title: ' liberté de CHOIX ' }] },
      argumentRepo: fakeArgumentRepo([existing]),
    })

    expect(Either.isRight(result) && result.right).toEqual({
      existingIds: [existing.id],
      toCreate: [],
    })
  })

  it('keeps one proposal per title and the chosen arguments once', async () => {
    const existing = sampleArgument()
    const result = await validateStatementArguments({
      contributor: eloquent,
      input: {
        argumentIds: [existing.id, existing.id],
        newArguments: [proposed, { ...proposed, title: proposed.title.toUpperCase() }],
      },
      argumentRepo: fakeArgumentRepo([existing]),
    })

    expect(Either.isRight(result) && result.right).toEqual({
      existingIds: [existing.id],
      toCreate: [proposed],
    })
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
