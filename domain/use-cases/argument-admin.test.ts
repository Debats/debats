import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { renameArgumentUseCase } from './rename-argument'
import { mergeArgumentsUseCase } from './merge-arguments'
import { fakeArgumentRepo, sampleArgument } from './argument-test-helpers'

const idealiste = { id: 'contributor-1', reputation: 10000 }
const eloquent = { id: 'contributor-2', reputation: 1000 }

describe('renameArgumentUseCase', () => {
  it('requires the Idéaliste rank', async () => {
    const argument = sampleArgument()
    const result = await renameArgumentUseCase({
      contributor: eloquent,
      argumentId: argument.id,
      title: 'Coût pour les finances publiques',
      description: '',
      argumentRepo: fakeArgumentRepo([argument]),
    })

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('refuses a title another argument already bears', async () => {
    const argument = sampleArgument()
    const other = sampleArgument('Liberté de choix')
    const result = await renameArgumentUseCase({
      contributor: idealiste,
      argumentId: argument.id,
      title: 'liberté de choix',
      description: '',
      argumentRepo: fakeArgumentRepo([argument, other]),
    })

    expect(Either.isLeft(result) && typeof result.left !== 'string' && result.left.title).toContain(
      'fusionnez',
    )
  })

  it('renames the argument and moves its slug', async () => {
    const argument = sampleArgument()
    const argumentRepo = fakeArgumentRepo([argument])
    const result = await renameArgumentUseCase({
      contributor: idealiste,
      argumentId: argument.id,
      title: 'Coût pour les finances publiques',
      description: 'Nouvelle description.',
      argumentRepo,
    })

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.slug).toBe('cout-pour-les-finances-publiques')
      expect(result.right.description).toBe('Nouvelle description.')
      expect(argumentRepo.rows[0].title).toBe('Coût pour les finances publiques')
    }
  })
})

describe('mergeArgumentsUseCase', () => {
  it('requires the Idéaliste rank', async () => {
    const [a, b] = [sampleArgument('Coût budgétaire'), sampleArgument('Coût pour l’État')]
    const result = await mergeArgumentsUseCase({
      contributor: eloquent,
      sourceArgumentId: a.id,
      targetArgumentId: b.id,
      argumentRepo: fakeArgumentRepo([a, b]),
    })

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('refuses to merge an argument into itself', async () => {
    const a = sampleArgument('Coût budgétaire')
    const result = await mergeArgumentsUseCase({
      contributor: idealiste,
      sourceArgumentId: a.id,
      targetArgumentId: a.id,
      argumentRepo: fakeArgumentRepo([a]),
    })

    expect(Either.isLeft(result) && result.left).toContain('lui-même')
  })

  it('merges the source into the target and returns the target', async () => {
    const [a, b] = [sampleArgument('Coût budgétaire'), sampleArgument('Coût pour l’État')]
    const argumentRepo = fakeArgumentRepo([a, b])
    const result = await mergeArgumentsUseCase({
      contributor: idealiste,
      sourceArgumentId: a.id,
      targetArgumentId: b.id,
      argumentRepo,
    })

    expect(Either.isRight(result) && result.right.id).toBe(b.id)
    expect(argumentRepo.merges).toEqual([{ sourceId: a.id, targetId: b.id }])
  })
})
