import { describe, it, expect } from 'vitest'
import { Effect } from 'effect'
import { resolveDraft } from './resolve-draft'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { SubjectRepository } from '../repositories/subject-repository'
import { PositionRepository } from '../repositories/position-repository'
import { PublicFigure } from '../entities/public-figure'
import { Subject } from '../entities/subject'
import { Position, PositionId, PositionSlug, PositionTitle } from '../entities/position'
import { draftOrganisationAuthor, draftPublicFigureAuthor } from '../entities/draft-statement'
import { fakeOrganisationRepo, sampleOrganisation } from './organisation-test-helpers'
import {
  makeDraft,
  makeOrganisationDraft,
  makePublicFigure,
  makeSubject,
  makePosition,
} from './draft-test-helpers'

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

const noOrganisation: OrganisationRepository = fakeOrganisationRepo()

describe('resolveDraft', () => {
  it('should mark all entities as found when they exist', async () => {
    const result = await Effect.runPromise(
      resolveDraft(makeDraft(), {
        publicFigureRepo: stubPublicFigureRepo(makePublicFigure()),
        organisationRepo: noOrganisation,
        subjectRepo: stubSubjectRepo(makeSubject()),
        positionRepo: stubPositionRepo([makePosition()]),
      }),
    )

    expect(result.author).toEqual({
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

  it('should resolve an organisation author against the organisation repository', async () => {
    const organisation = sampleOrganisation()
    const result = await Effect.runPromise(
      resolveDraft(makeOrganisationDraft(), {
        publicFigureRepo: stubPublicFigureRepo(null),
        organisationRepo: fakeOrganisationRepo([organisation]),
        subjectRepo: stubSubjectRepo(makeSubject()),
        positionRepo: stubPositionRepo([makePosition()]),
      }),
    )

    expect(result.author).toEqual({
      found: true,
      entity: { id: organisation.id, name: 'Attac France', slug: 'attac-france' },
    })
    expect(result.canValidate).toBe(true)
  })

  it('should mark an unknown organisation as creatable when data is present', async () => {
    const result = await Effect.runPromise(
      resolveDraft(makeOrganisationDraft(), {
        publicFigureRepo: stubPublicFigureRepo(null),
        organisationRepo: noOrganisation,
        subjectRepo: stubSubjectRepo(makeSubject()),
        positionRepo: stubPositionRepo([makePosition()]),
      }),
    )

    expect(result.author).toEqual({ found: false, canCreate: true })
    expect(result.canValidate).toBe(true)
  })

  it('should mark an unknown organisation as not creatable without data', async () => {
    const result = await Effect.runPromise(
      resolveDraft(makeOrganisationDraft({ author: draftOrganisationAuthor('Attac France') }), {
        publicFigureRepo: stubPublicFigureRepo(null),
        organisationRepo: noOrganisation,
        subjectRepo: stubSubjectRepo(makeSubject()),
        positionRepo: stubPositionRepo([makePosition()]),
      }),
    )

    expect(result.author).toEqual({ found: false, canCreate: false })
    expect(result.canValidate).toBe(false)
  })

  it('should mark entities as creatable when not found but data is present', async () => {
    const result = await Effect.runPromise(
      resolveDraft(makeDraft(), {
        publicFigureRepo: stubPublicFigureRepo(null),
        organisationRepo: noOrganisation,
        subjectRepo: stubSubjectRepo(null),
        positionRepo: stubPositionRepo([]),
      }),
    )

    expect(result.author).toEqual({ found: false, canCreate: true })
    expect(result.subject).toEqual({ found: false, canCreate: true })
    expect(result.position).toEqual({ found: false, canCreate: true })
    expect(result.canValidate).toBe(true)
  })

  it('should mark entities as not creatable when not found and no data', async () => {
    const draft = makeDraft({
      author: draftPublicFigureAuthor('Jean-Luc Mélenchon'),
      subjectData: null,
      positionData: null,
    })
    const result = await Effect.runPromise(
      resolveDraft(draft, {
        publicFigureRepo: stubPublicFigureRepo(null),
        organisationRepo: noOrganisation,
        subjectRepo: stubSubjectRepo(null),
        positionRepo: stubPositionRepo([]),
      }),
    )

    expect(result.author).toEqual({ found: false, canCreate: false })
    expect(result.subject).toEqual({ found: false, canCreate: false })
    expect(result.position).toEqual({ found: false, canCreate: false })
    expect(result.canValidate).toBe(false)
  })

  it('should not match position when title differs', async () => {
    const otherPosition = Position.make({
      id: PositionId.make('pos-2'),
      title: PositionTitle.make('Autre position sur ce sujet'),
      slug: PositionSlug.make('autre-position-sur-ce-sujet'),
      description: 'Une autre position.',
      subjectId: 'sub-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await Effect.runPromise(
      resolveDraft(makeDraft(), {
        publicFigureRepo: stubPublicFigureRepo(makePublicFigure()),
        organisationRepo: noOrganisation,
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
        organisationRepo: noOrganisation,
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
        organisationRepo: noOrganisation,
        subjectRepo: stubSubjectRepo(null),
        positionRepo: stubPositionRepo([]),
      }),
    )

    expect(result.author.found).toBe(true)
    expect(result.subject).toEqual({ found: false, canCreate: true })
    expect(result.position).toEqual({ found: false, canCreate: true })
    expect(result.canValidate).toBe(true)
  })
})
