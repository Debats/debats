import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { createOccupationUseCase } from './create-occupation'
import { createOccupationFamilyUseCase } from './create-occupation-family'
import { deleteOccupationUseCase } from './delete-occupation'
import { deleteOccupationFamilyUseCase } from './delete-occupation-family'
import { setPublicFigureOccupationsUseCase } from './set-public-figure-occupations'
import {
  fakeFamilyRepo,
  fakeFamilySource,
  fakeOccupationRepo,
  journalWithFamilies,
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

const eventsOf = (unit: { journal: { all: () => { type: string; streamId: string }[] } }) =>
  unit.journal.all().map((e) => [e.streamId, e.type])

describe('createOccupationFamilyUseCase', () => {
  const familyParams = (unit = inMemoryUnitOfWork(), seed = [sampleFamily()]) => ({
    contributor: idealiste,
    name: 'Religieux',
    description: '',
    runUnitOfWork: unit.run,
    familyRepo: fakeFamilyRepo(seed),
  })

  it('requires the Idéaliste rank', async () => {
    const result = await createOccupationFamilyUseCase({
      ...familyParams(),
      contributor: eloquent,
    })

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('refuses a name already in the list', async () => {
    const result = await createOccupationFamilyUseCase({
      ...familyParams(inMemoryUnitOfWork(), [sampleFamily('Religieux')]),
    })

    expect(Either.isLeft(result) && result.left).toEqual({ name: 'Une famille porte déjà ce nom.' })
  })

  it('opens the family stream after the existing families', async () => {
    const unit = inMemoryUnitOfWork()
    const result = await createOccupationFamilyUseCase(
      familyParams(unit, [sampleFamily('Exécutif', 1), sampleFamily('Santé', 7)]),
    )

    expect(Either.isRight(result) && result.right).toMatchObject({
      slug: 'religieux',
      position: 8,
      createdBy: 'idealiste',
    })
    expect(unit.journal.all().map((e) => [e.type, e.revision])).toEqual([
      ['OccupationFamilyAdded', 1],
    ])
  })
})

describe('createOccupationUseCase', () => {
  const family = sampleFamily()
  const occupationParams = (
    unit = inMemoryUnitOfWork(),
    listed = [] as ReturnType<typeof sampleOccupation>[],
  ) => ({
    contributor: idealiste,
    name: 'Député·e',
    familyId: family.id,
    description: 'Membre de l’Assemblée nationale',
    runUnitOfWork: unit.run,
    familySource: fakeFamilySource([family], listed),
    occupationRepo: fakeOccupationRepo(listed),
  })

  it('requires the Idéaliste rank', async () => {
    const result = await createOccupationUseCase({
      ...occupationParams(),
      contributor: eloquent,
    })

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('refuses an unknown family', async () => {
    const result = await createOccupationUseCase({ ...occupationParams(), familyId: 'missing' })

    expect(Either.isLeft(result) && result.left).toEqual({
      familyId: 'Choisissez une famille de métiers.',
    })
  })

  it('refuses a name already in the list, whatever its spacing or family', async () => {
    const result = await createOccupationUseCase({
      ...occupationParams(inMemoryUnitOfWork(), [sampleOccupation('Député·e', 'other-family')]),
      name: ' Député·e ',
    })

    expect(Either.isLeft(result) && result.left).toEqual({ name: 'Un métier porte déjà ce nom.' })
  })

  it('records the occupation in the stream of its family', async () => {
    const unit = await journalWithFamilies([family])
    const result = await createOccupationUseCase(occupationParams(unit))

    expect(Either.isRight(result) && result.right).toMatchObject({
      slug: 'depute-e',
      familyId: family.id,
      description: 'Membre de l’Assemblée nationale',
      createdBy: 'idealiste',
    })
    expect(eventsOf(unit)).toEqual([
      [family.id, 'OccupationFamilyAdded'],
      [family.id, 'OccupationAdded'],
    ])
  })

  it('imports a family the journal does not know yet, with its occupations', async () => {
    const unit = inMemoryUnitOfWork()
    const listed = [sampleOccupation('Économiste', family.id)]
    const result = await createOccupationUseCase(occupationParams(unit, listed))

    expect(Either.isRight(result)).toBe(true)
    expect(eventsOf(unit)).toEqual([
      [family.id, 'OccupationFamilyImported'],
      [family.id, 'OccupationImported'],
      [family.id, 'OccupationAdded'],
    ])
  })

  it('refuses a family deleted meanwhile', async () => {
    const unit = await journalWithFamilies([family])
    await deleteOccupationFamilyUseCase({
      contributor: idealiste,
      familyId: family.id,
      runUnitOfWork: unit.run,
      familySource: fakeFamilySource([family]),
    })
    const result = await createOccupationUseCase(occupationParams(unit))

    expect(Either.isLeft(result) && result.left).toEqual({
      familyId: 'Choisissez une famille de métiers.',
    })
  })
})

describe('deleteOccupationUseCase', () => {
  const family = sampleFamily()
  const occupation = sampleOccupation('Économiste', family.id)
  const deleteParams = (unit = inMemoryUnitOfWork()) => ({
    contributor: idealiste,
    occupationId: occupation.id,
    runUnitOfWork: unit.run,
    familySource: fakeFamilySource([family], [occupation]),
    occupationRepo: fakeOccupationRepo([occupation]),
  })

  it('requires the Idéaliste rank', async () => {
    const result = await deleteOccupationUseCase({ ...deleteParams(), contributor: eloquent })

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('refuses an occupation nobody knows', async () => {
    const result = await deleteOccupationUseCase({ ...deleteParams(), occupationId: 'missing' })

    expect(Either.isLeft(result) && result.left).toContain('introuvable')
  })

  it('records the removal in the stream of its family', async () => {
    const unit = await journalWithFamilies([family], [occupation])
    const result = await deleteOccupationUseCase(deleteParams(unit))

    expect(Either.isRight(result)).toBe(true)
    expect(eventsOf(unit).at(-1)).toEqual([family.id, 'OccupationRemoved'])
  })

  it('refuses an occupation already removed from its family', async () => {
    const unit = await journalWithFamilies([family], [occupation])
    await deleteOccupationUseCase(deleteParams(unit))
    const result = await deleteOccupationUseCase(deleteParams(unit))

    expect(Either.isLeft(result) && result.left).toContain('introuvable')
    expect(eventsOf(unit).filter(([, type]) => type === 'OccupationRemoved')).toHaveLength(1)
  })
})

describe('deleteOccupationFamilyUseCase', () => {
  const family = sampleFamily()
  const deleteParams = (unit = inMemoryUnitOfWork()) => ({
    contributor: idealiste,
    familyId: family.id,
    runUnitOfWork: unit.run,
    familySource: fakeFamilySource([family]),
  })

  it('requires the Idéaliste rank', async () => {
    const result = await deleteOccupationFamilyUseCase({
      ...deleteParams(),
      contributor: eloquent,
    })

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('records the deletion', async () => {
    const unit = await journalWithFamilies([family])
    const result = await deleteOccupationFamilyUseCase(deleteParams(unit))

    expect(Either.isRight(result)).toBe(true)
    expect(eventsOf(unit)).toEqual([
      [family.id, 'OccupationFamilyAdded'],
      [family.id, 'OccupationFamilyDeleted'],
    ])
  })

  it('refuses a family already deleted', async () => {
    const unit = await journalWithFamilies([family])
    await deleteOccupationFamilyUseCase(deleteParams(unit))
    const result = await deleteOccupationFamilyUseCase(deleteParams(unit))

    expect(Either.isLeft(result) && result.left).toContain('introuvable')
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
