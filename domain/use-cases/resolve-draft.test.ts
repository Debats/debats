import { describe, it, expect } from 'vitest'
import { Effect } from 'effect'
import { resolveDraft } from './resolve-draft'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { SubjectRepository } from '../repositories/subject-repository'
import { PositionRepository } from '../repositories/position-repository'
import { PublicFigure } from '../entities/public-figure'
import { Subject } from '../entities/subject'
import { Position, PositionId, PositionTitle } from '../entities/position'
import { makeDraft, makePublicFigure, makeSubject, makePosition } from './draft-test-helpers'

const stubPublicFigureRepo = (figure: PublicFigure | null): PublicFigureRepository =>
  ({
    findBySlug: () => Effect.succeed(figure),
  }) as unknown as PublicFigureRepository

const stubSubjectRepo = (subject: Subject | null): SubjectRepository =>
  ({
    findBySlug: () => Effect.succeed(subject),
  }) as unknown as SubjectRepository

const stubPositionRepo = (positions: Position[]): PositionRepository =>
  ({
    findBySubjectId: () => Effect.succeed(positions),
  }) as unknown as PositionRepository

describe('resolveDraft', () => {
  it('should mark all entities as found when they exist', async () => {
    const result = await Effect.runPromise(
      resolveDraft(makeDraft(), {
        publicFigureRepo: stubPublicFigureRepo(makePublicFigure()),
        subjectRepo: stubSubjectRepo(makeSubject()),
        positionRepo: stubPositionRepo([makePosition()]),
      }),
    )

    expect(result.publicFigure).toEqual({
      found: true,
      entity: { id: 'pf-1', name: 'Jean-Luc Mélenchon', slug: 'jean-luc-melenchon' },
    })
    expect(result.subject).toEqual({
      found: true,
      entity: { id: 'sub-1', title: "L'immigration", slug: 'l-immigration' },
    })
    expect(result.position).toEqual({
      found: true,
      entity: { id: 'pos-1', title: 'Régularisation des sans-papiers' },
    })
    expect(result.canValidate).toBe(true)
  })

  it('should mark entities as creatable when not found but data is present', async () => {
    const result = await Effect.runPromise(
      resolveDraft(makeDraft(), {
        publicFigureRepo: stubPublicFigureRepo(null),
        subjectRepo: stubSubjectRepo(null),
        positionRepo: stubPositionRepo([]),
      }),
    )

    expect(result.publicFigure).toEqual({ found: false, canCreate: true })
    expect(result.subject).toEqual({ found: false, canCreate: true })
    expect(result.position).toEqual({ found: false, canCreate: true })
    expect(result.canValidate).toBe(true)
  })

  it('should mark entities as not creatable when not found and no data', async () => {
    const draft = makeDraft({
      publicFigureData: null,
      subjectData: null,
      positionData: null,
    })
    const result = await Effect.runPromise(
      resolveDraft(draft, {
        publicFigureRepo: stubPublicFigureRepo(null),
        subjectRepo: stubSubjectRepo(null),
        positionRepo: stubPositionRepo([]),
      }),
    )

    expect(result.publicFigure).toEqual({ found: false, canCreate: false })
    expect(result.subject).toEqual({ found: false, canCreate: false })
    expect(result.position).toEqual({ found: false, canCreate: false })
    expect(result.canValidate).toBe(false)
  })

  it('should not match position when title differs', async () => {
    const otherPosition = Position.make({
      id: PositionId.make('pos-2'),
      title: PositionTitle.make('Autre position sur ce sujet'),
      description: 'Une autre position.',
      subjectId: 'sub-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await Effect.runPromise(
      resolveDraft(makeDraft(), {
        publicFigureRepo: stubPublicFigureRepo(makePublicFigure()),
        subjectRepo: stubSubjectRepo(makeSubject()),
        positionRepo: stubPositionRepo([otherPosition]),
      }),
    )

    expect(result.position).toEqual({ found: false, canCreate: true })
    expect(result.canValidate).toBe(true)
  })

  it('should not look up positions when subject cannot be resolved', async () => {
    const draft = makeDraft({ subjectData: null, positionData: null })
    const result = await Effect.runPromise(
      resolveDraft(draft, {
        publicFigureRepo: stubPublicFigureRepo(makePublicFigure()),
        subjectRepo: stubSubjectRepo(null),
        positionRepo: stubPositionRepo([]),
      }),
    )

    expect(result.subject).toEqual({ found: false, canCreate: false })
    expect(result.position).toEqual({ found: false, canCreate: false })
    expect(result.canValidate).toBe(false)
  })

  it('should handle mixed resolution: some found, some creatable', async () => {
    const result = await Effect.runPromise(
      resolveDraft(makeDraft(), {
        publicFigureRepo: stubPublicFigureRepo(makePublicFigure()),
        subjectRepo: stubSubjectRepo(null),
        positionRepo: stubPositionRepo([]),
      }),
    )

    expect(result.publicFigure.found).toBe(true)
    expect(result.subject).toEqual({ found: false, canCreate: true })
    expect(result.position).toEqual({ found: false, canCreate: true })
    expect(result.canValidate).toBe(true)
  })
})
