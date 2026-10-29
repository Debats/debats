import { describe, it, expect } from 'vitest'
import { Either, Layer } from 'effect'
import { createThemeUseCase } from './create-theme'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { ThemeRepository } from '../repositories/theme-repository'
import { runFormWith } from './command-test-helpers'
import { fakeThemeRepo, sampleTheme } from './theme-test-helpers'

const idealiste = { id: 'abc', reputation: 10000 }

const validParams = {
  contributor: idealiste,
  name: 'Économie',
  description: 'Fiscalité, emploi, finances publiques, marché du travail',
}

const execute = runFormWith(Layer.succeed(ThemeRepository, fakeThemeRepo()))

describe('createThemeUseCase', () => {
  it('should fail when contributor is null (not authenticated)', async () => {
    const result = await execute(createThemeUseCase({ ...validParams, contributor: null }))

    expect(Either.isLeft(result) && result.left).toContain('connecté')
  })

  it('should fail when contributor lacks reputation (requires Idéaliste)', async () => {
    const result = await execute(
      createThemeUseCase({ ...validParams, contributor: { id: 'abc', reputation: 1000 } }),
    )

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('should fail when name is too short', async () => {
    const result = await execute(createThemeUseCase({ ...validParams, name: 'A' }))

    expect(Either.isLeft(result)).toBe(true)
  })

  it('should fail when description is too short', async () => {
    const result = await execute(createThemeUseCase({ ...validParams, description: 'Court' }))

    expect(Either.isLeft(result)).toBe(true)
  })

  it('should fail when a theme with the same slug already exists', async () => {
    const result = await runFormWith(
      Layer.succeed(ThemeRepository, fakeThemeRepo([sampleTheme()])),
    )(createThemeUseCase(validParams))

    expect(Either.isLeft(result) && result.left).toContain('existe déjà')
  })

  it('records the theme in the journal', async () => {
    const unit = inMemoryUnitOfWork()
    const result = await execute(createThemeUseCase(validParams), unit.run)

    expect(Either.isRight(result) && result.right).toMatchObject({
      name: 'Économie',
      slug: 'economie',
      createdBy: 'abc',
    })
    expect(unit.journal.all()).toMatchObject([
      { streamType: 'theme', revision: 1, type: 'ThemeAdded', actorId: 'abc' },
    ])
  })
})
