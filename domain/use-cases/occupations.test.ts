import { describe, it, expect } from 'vitest'
import { Either, Effect } from 'effect'
import { createOccupationUseCase } from './create-occupation'
import { createOccupationFamilyUseCase } from './create-occupation-family'
import { deleteOccupationUseCase } from './delete-occupation'
import { deleteOccupationFamilyUseCase } from './delete-occupation-family'
import { setPublicFigureOccupationsUseCase } from './set-public-figure-occupations'
import {
  fakeFamilyRepo,
  fakeOccupationRepo,
  sampleFamily,
  sampleOccupation,
} from './occupation-test-helpers'
import { createPublicFigure } from '../entities/public-figure'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import {
  fakePublicFigureSource,
  figureParts,
  journalWithFigures,
} from './public-figure-test-helpers'

const meteque = { id: 'meteque', reputation: 0 }
const eloquent = { id: 'eloquent', reputation: 1000 }
const idealiste = { id: 'idealiste', reputation: 10000 }

const figure = createPublicFigure({
  name: 'Thomas Piketty',
  presentation: 'Économiste français, auteur du Capital au XXIe siècle.',
  createdBy: 'founder',
})

describe('createOccupationFamilyUseCase', () => {
  it('requires the Idéaliste rank', async () => {
    const result = await createOccupationFamilyUseCase({
      contributor: eloquent,
      name: 'Santé',
      description: '',
      familyRepo: fakeFamilyRepo(),
    })

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('appends the family after the existing ones', async () => {
    const repo = fakeFamilyRepo([sampleFamily('Exécutif', 1), sampleFamily('Santé', 7)])
    const result = await createOccupationFamilyUseCase({
      contributor: idealiste,
      name: 'Religieux',
      description: '',
      familyRepo: repo,
    })

    expect(Either.isRight(result) && result.right.position).toBe(8)
    expect(repo.rows).toHaveLength(3)
  })
})

describe('createOccupationUseCase', () => {
  const family = sampleFamily()

  it('requires the Idéaliste rank', async () => {
    const result = await createOccupationUseCase({
      contributor: eloquent,
      name: 'Économiste',
      familyId: family.id,
      description: '',
      occupationRepo: fakeOccupationRepo(),
      familyRepo: fakeFamilyRepo([family]),
    })

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('refuses an unknown family', async () => {
    const result = await createOccupationUseCase({
      contributor: idealiste,
      name: 'Économiste',
      familyId: 'missing',
      description: '',
      occupationRepo: fakeOccupationRepo(),
      familyRepo: fakeFamilyRepo([family]),
    })

    expect(Either.isLeft(result) && result.left).toEqual({
      familyId: 'Choisissez une famille de métiers.',
    })
  })

  it('refuses a name already in the list, whatever its spacing', async () => {
    const result = await createOccupationUseCase({
      contributor: idealiste,
      name: ' Économiste ',
      familyId: family.id,
      description: '',
      occupationRepo: fakeOccupationRepo([sampleOccupation('Économiste', family.id)]),
      familyRepo: fakeFamilyRepo([family]),
    })

    expect(Either.isLeft(result) && result.left).toEqual({ name: 'Un métier porte déjà ce nom.' })
  })

  it('creates the occupation in its family', async () => {
    const repo = fakeOccupationRepo()
    const result = await createOccupationUseCase({
      contributor: idealiste,
      name: 'Député·e',
      familyId: family.id,
      description: 'Membre de l’Assemblée nationale',
      occupationRepo: repo,
      familyRepo: fakeFamilyRepo([family]),
    })

    expect(Either.isRight(result) && result.right.slug).toBe('depute-e')
    expect(Either.isRight(result) && result.right.familyId).toBe(family.id)
    expect(repo.rows).toHaveLength(1)
  })
})

describe('deleteOccupationUseCase', () => {
  it('requires the Idéaliste rank', async () => {
    const occupation = sampleOccupation()
    const result = await deleteOccupationUseCase({
      contributor: eloquent,
      occupationId: occupation.id,
      occupationRepo: fakeOccupationRepo([occupation]),
    })

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('removes the occupation', async () => {
    const occupation = sampleOccupation()
    const repo = fakeOccupationRepo([occupation])
    const result = await deleteOccupationUseCase({
      contributor: idealiste,
      occupationId: occupation.id,
      occupationRepo: repo,
    })

    expect(Either.isRight(result)).toBe(true)
    expect(repo.rows).toHaveLength(0)
  })
})

describe('deleteOccupationFamilyUseCase', () => {
  it('removes the family', async () => {
    const family = sampleFamily()
    const repo = fakeFamilyRepo([family])
    const result = await deleteOccupationFamilyUseCase({
      contributor: idealiste,
      familyId: family.id,
      familyRepo: repo,
    })

    expect(Either.isRight(result)).toBe(true)
    expect(repo.rows).toHaveLength(0)
  })
})

describe('setPublicFigureOccupationsUseCase', () => {
  const onFigure = {
    runUnitOfWork: inMemoryUnitOfWork().run,
    publicFigureSource: fakePublicFigureSource([figureParts(figure)]),
  }

  it('requires the Éloquent rank', async () => {
    const result = await setPublicFigureOccupationsUseCase({
      ...onFigure,
      contributor: meteque,
      publicFigureId: figure.id,
      assignments: [],
      occupationRepo: fakeOccupationRepo(),
    })

    expect(Either.isLeft(result) && result.left).toContain('Éloquent')
  })

  it('refuses an occupation that is not in the list', async () => {
    const result = await setPublicFigureOccupationsUseCase({
      ...onFigure,
      contributor: eloquent,
      publicFigureId: figure.id,
      assignments: [{ occupationId: 'unknown', current: true }],
      occupationRepo: fakeOccupationRepo(),
    })

    expect(Either.isLeft(result) && result.left).toContain('n’existe plus')
  })

  it('refuses an unknown public figure', async () => {
    const result = await setPublicFigureOccupationsUseCase({
      ...onFigure,
      contributor: eloquent,
      publicFigureId: 'missing',
      assignments: [],
      occupationRepo: fakeOccupationRepo(),
    })

    expect(Either.isLeft(result) && result.left).toContain('introuvable')
  })

  it('records the assignments, the last word on « current » winning over a duplicate', async () => {
    const [economist, writer] = [sampleOccupation('Économiste'), sampleOccupation('Écrivain·e')]
    const { run, journal } = await journalWithFigures(figure)
    const result = await setPublicFigureOccupationsUseCase({
      ...onFigure,
      runUnitOfWork: run,
      contributor: eloquent,
      publicFigureId: figure.id,
      assignments: [
        { occupationId: economist.id, current: true },
        { occupationId: writer.id, current: false },
        { occupationId: economist.id, current: false },
      ],
      occupationRepo: fakeOccupationRepo([economist, writer]),
    })

    expect(Either.isRight(result)).toBe(true)
    expect(journal.all().at(-1)).toMatchObject({
      type: 'OccupationsSet',
      actorId: 'eloquent',
      payload: {
        occupations: [
          { occupationId: economist.id, current: false },
          { occupationId: writer.id, current: false },
        ],
      },
    })
  })
})
