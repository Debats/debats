import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { createThemeUseCase } from './create-theme'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { fakeThemeRepo, sampleTheme } from './theme-test-helpers'

const idealiste = { id: 'abc', reputation: 10000 }

const validParams = {
  contributor: idealiste,
  name: 'Économie',
  description: 'Fiscalité, emploi, finances publiques, marché du travail',
  runUnitOfWork: inMemoryUnitOfWork().run,
  themeRepo: fakeThemeRepo(),
}

describe('createThemeUseCase', () => {
  it('should fail when contributor is null (not authenticated)', async () => {
    const result = await createThemeUseCase({ ...validParams, contributor: null })

    expect(Either.isLeft(result) && result.left).toContain('connecté')
  })

  it('should fail when contributor lacks reputation (requires Idéaliste)', async () => {
    const result = await createThemeUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
    })

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('should fail when name is too short', async () => {
    const result = await createThemeUseCase({ ...validParams, name: 'A' })

    expect(Either.isLeft(result)).toBe(true)
  })

  it('should fail when description is too short', async () => {
    const result = await createThemeUseCase({ ...validParams, description: 'Court' })

    expect(Either.isLeft(result)).toBe(true)
  })

  it('should fail when a theme with the same slug already exists', async () => {
    const result = await createThemeUseCase({
      ...validParams,
      themeRepo: fakeThemeRepo([sampleTheme()]),
    })

    expect(Either.isLeft(result) && result.left).toContain('existe déjà')
  })

  it('records the theme in the journal', async () => {
    const unit = inMemoryUnitOfWork()
    const result = await createThemeUseCase({ ...validParams, runUnitOfWork: unit.run })

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
