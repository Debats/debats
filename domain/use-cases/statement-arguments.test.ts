import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { attachStatementArguments, validateStatementArguments } from './statement-arguments'
import { fakeArgumentRepo, sampleArgument } from './argument-test-helpers'
import { fakeReputationRepo } from './organisation-test-helpers'

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

describe('attachStatementArguments', () => {
  it('creates the proposals, links everything to the statement and rewards the contributor', async () => {
    const existing = sampleArgument()
    const argumentRepo = fakeArgumentRepo([existing])
    const reputationRepo = fakeReputationRepo()

    const created = await attachStatementArguments({
      contributor: eloquent,
      statementId: 'statement-1',
      validated: { existingIds: [existing.id], toCreate: [proposed] },
      argumentRepo,
      reputationRepo,
    })

    expect(created).toHaveLength(1)
    expect(created[0].title).toBe('Liberté de choix')
    expect(created[0].slug).toBe('liberte-de-choix')
    expect(argumentRepo.links.get('statement-1')).toEqual([existing.id, created[0].id])
    expect(reputationRepo.events.map((e) => e.action)).toEqual([
      'added_argument_validated',
      'linked_argument_to_statement',
      'linked_argument_to_statement',
    ])
  })
})
