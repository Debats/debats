import { describe, it, expect } from 'vitest'
import { Either, Layer } from 'effect'
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
import { Occupation } from '../entities/occupation'
import { OccupationFamily } from '../entities/occupation-family'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { OccupationFamilyRepository } from '../repositories/occupation-family-repository'
import { OccupationRepository } from '../repositories/occupation-repository'
import { runFormWith, runWith } from './command-test-helpers'
import { OccupationFamilySource } from './occupation-family-stream'
import { PublicFigureSource } from './public-figure-stream'
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

/** The tables as the test wants them: these families, with these occupations */
const familiesKnown = (families: OccupationFamily[], listed: Occupation[] = []) =>
  Layer.mergeAll(
    Layer.succeed(OccupationFamilySource, fakeFamilySource(families, listed)),
    Layer.succeed(OccupationFamilyRepository, fakeFamilyRepo(families)),
    Layer.succeed(OccupationRepository, fakeOccupationRepo(listed)),
  )

describe('createOccupationFamilyUseCase', () => {
  const familyParams = {
    contributor: idealiste,
    name: 'Religieux',
    description: '',
  }
  const execute = (seed = [sampleFamily()]) => runFormWith(familiesKnown(seed))

  it('requires the Idéaliste rank', async () => {
    const result = await execute()(
      createOccupationFamilyUseCase({ ...familyParams, contributor: eloquent }),
    )

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('refuses a name already in the list', async () => {
    const result = await execute([sampleFamily('Religieux')])(
      createOccupationFamilyUseCase(familyParams),
    )

    expect(Either.isLeft(result) && result.left).toEqual({ name: 'Une famille porte déjà ce nom.' })
  })

  it('opens the family stream after the existing families', async () => {
    const unit = inMemoryUnitOfWork()
    const result = await execute([sampleFamily('Exécutif', 1), sampleFamily('Santé', 7)])(
      createOccupationFamilyUseCase(familyParams),
      unit.run,
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
  const occupationParams = {
    contributor: idealiste,
    name: 'Député·e',
    familyId: family.id,
    description: 'Membre de l’Assemblée nationale',
  }
  const execute = (listed: Occupation[] = []) => runFormWith(familiesKnown([family], listed))

  it('requires the Idéaliste rank', async () => {
    const result = await execute()(
      createOccupationUseCase({ ...occupationParams, contributor: eloquent }),
    )

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('refuses an unknown family', async () => {
    const result = await execute()(
      createOccupationUseCase({ ...occupationParams, familyId: 'missing' }),
    )

    expect(Either.isLeft(result) && result.left).toEqual({
      familyId: 'Choisissez une famille de métiers.',
    })
  })

  it('refuses a name already in the list, whatever its spacing or family', async () => {
    const result = await execute([sampleOccupation('Député·e', 'other-family')])(
      createOccupationUseCase({ ...occupationParams, name: ' Député·e ' }),
    )

    expect(Either.isLeft(result) && result.left).toEqual({ name: 'Un métier porte déjà ce nom.' })
  })

  it('records the occupation in the stream of its family', async () => {
    const unit = await journalWithFamilies([family])
    const result = await execute()(createOccupationUseCase(occupationParams), unit.run)

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
    const result = await execute(listed)(createOccupationUseCase(occupationParams), unit.run)

    expect(Either.isRight(result)).toBe(true)
    expect(eventsOf(unit)).toEqual([
      [family.id, 'OccupationFamilyImported'],
      [family.id, 'OccupationImported'],
      [family.id, 'OccupationAdded'],
    ])
  })

  it('refuses a family deleted meanwhile', async () => {
    const unit = await journalWithFamilies([family])
    await runWith(familiesKnown([family]))(
      deleteOccupationFamilyUseCase({ contributor: idealiste, familyId: family.id }),
      unit.run,
    )
    const result = await execute()(createOccupationUseCase(occupationParams), unit.run)

    expect(Either.isLeft(result) && result.left).toEqual({
      familyId: 'Choisissez une famille de métiers.',
    })
  })
})

describe('deleteOccupationUseCase', () => {
  const family = sampleFamily()
  const occupation = sampleOccupation('Économiste', family.id)
  const deleteParams = { contributor: idealiste, occupationId: occupation.id }
  const execute = runWith(familiesKnown([family], [occupation]))

  it('requires the Idéaliste rank', async () => {
    const result = await execute(
      deleteOccupationUseCase({ ...deleteParams, contributor: eloquent }),
    )

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('refuses an occupation nobody knows', async () => {
    const result = await execute(
      deleteOccupationUseCase({ ...deleteParams, occupationId: 'missing' }),
    )

    expect(Either.isLeft(result) && result.left).toContain('introuvable')
  })

  it('records the removal in the stream of its family', async () => {
    const unit = await journalWithFamilies([family], [occupation])
    const result = await execute(deleteOccupationUseCase(deleteParams), unit.run)

    expect(Either.isRight(result)).toBe(true)
    expect(eventsOf(unit).at(-1)).toEqual([family.id, 'OccupationRemoved'])
  })

  it('refuses an occupation already removed from its family', async () => {
    const unit = await journalWithFamilies([family], [occupation])
    await execute(deleteOccupationUseCase(deleteParams), unit.run)
    const result = await execute(deleteOccupationUseCase(deleteParams), unit.run)

    expect(Either.isLeft(result) && result.left).toContain('introuvable')
    expect(eventsOf(unit).filter(([, type]) => type === 'OccupationRemoved')).toHaveLength(1)
  })
})

describe('deleteOccupationFamilyUseCase', () => {
  const family = sampleFamily()
  const deleteParams = { contributor: idealiste, familyId: family.id }
  const execute = runWith(familiesKnown([family]))

  it('requires the Idéaliste rank', async () => {
    const result = await execute(
      deleteOccupationFamilyUseCase({ ...deleteParams, contributor: eloquent }),
    )

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('records the deletion', async () => {
    const unit = await journalWithFamilies([family])
    const result = await execute(deleteOccupationFamilyUseCase(deleteParams), unit.run)

    expect(Either.isRight(result)).toBe(true)
    expect(eventsOf(unit)).toEqual([
      [family.id, 'OccupationFamilyAdded'],
      [family.id, 'OccupationFamilyDeleted'],
    ])
  })

  it('refuses a family already deleted', async () => {
    const unit = await journalWithFamilies([family])
    await execute(deleteOccupationFamilyUseCase(deleteParams), unit.run)
    const result = await execute(deleteOccupationFamilyUseCase(deleteParams), unit.run)

    expect(Either.isLeft(result) && result.left).toContain('introuvable')
  })
})

describe('setPublicFigureOccupationsUseCase', () => {
  /** The tables as the test wants them: the figure, and the occupations on the list */
  const onFigure = (listed: Occupation[] = []) =>
    runWith(
      Layer.mergeAll(
        Layer.succeed(PublicFigureSource, fakePublicFigureSource([figureParts(figure)])),
        Layer.succeed(OccupationRepository, fakeOccupationRepo(listed)),
      ),
    )

  it('requires the Éloquent rank', async () => {
    const result = await onFigure()(
      setPublicFigureOccupationsUseCase({
        contributor: meteque,
        publicFigureId: figure.id,
        assignments: [],
      }),
    )

    expect(Either.isLeft(result) && result.left).toContain('Éloquent')
  })

  it('refuses an occupation that is not in the list', async () => {
    const result = await onFigure()(
      setPublicFigureOccupationsUseCase({
        contributor: eloquent,
        publicFigureId: figure.id,
        assignments: [{ occupationId: 'unknown', current: true }],
      }),
    )

    expect(Either.isLeft(result) && result.left).toContain('n’existe plus')
  })

  it('refuses an unknown public figure', async () => {
    const result = await onFigure()(
      setPublicFigureOccupationsUseCase({
        contributor: eloquent,
        publicFigureId: 'missing',
        assignments: [],
      }),
    )

    expect(Either.isLeft(result) && result.left).toContain('introuvable')
  })

  it('records the assignments, the last word on « current » winning over a duplicate', async () => {
    const [economist, writer] = [sampleOccupation('Économiste'), sampleOccupation('Écrivain·e')]
    const { run, journal } = await journalWithFigures(figure)
    const result = await onFigure([economist, writer])(
      setPublicFigureOccupationsUseCase({
        contributor: eloquent,
        publicFigureId: figure.id,
        assignments: [
          { occupationId: economist.id, current: true },
          { occupationId: writer.id, current: false },
          { occupationId: economist.id, current: false },
        ],
      }),
      run,
    )

    // The selector renders its next change from the revision the command reached
    expect(result).toEqual(Either.right(journal.all().at(-1)!.revision))
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
