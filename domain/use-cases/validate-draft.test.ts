import { describe, it, expect, vi } from 'vitest'
import { Effect, Either, Option } from 'effect'
import { validateDraft } from './validate-draft'
import {
  DraftStatement,
  draftOrganisationAuthor,
  draftPublicFigureAuthor,
} from '../entities/draft-statement'
import { DraftStatementRepository } from '../repositories/draft-statement-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { SubjectRepository } from '../repositories/subject-repository'
import { PositionRepository } from '../repositories/position-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { PublicFigure } from '../entities/public-figure'
import { Organisation } from '../entities/organisation'
import {
  fakeMembershipRepo,
  fakeOrganisationRepo,
  sampleOrganisation,
} from './organisation-test-helpers'
import { fakeArgumentRepo, sampleArgument } from './argument-test-helpers'
import { fakeOccupationRepo, sampleOccupation } from './occupation-test-helpers'
import { Argument } from '../entities/argument'
import { Occupation } from '../entities/occupation'
import { createMembership, OrganisationMembership } from '../entities/organisation-membership'
import { Subject } from '../entities/subject'
import { Position } from '../entities/position'
import { ContributorIdentity } from './types'
import {
  makeDraft,
  makeOrganisationDraft,
  makePublicFigure,
  makeSubject,
  makePosition,
} from './draft-test-helpers'

const ADMIN: ContributorIdentity = { id: 'user-1', reputation: 1_000_000 }

const fakeWikipediaValidator: WikipediaValidator = {
  validatePage: async () => ({ exists: true, isBiography: true }),
}

/**
 * Creates mock repos that track entities created via .create() so that
 * subsequent .findById() calls return them — mimicking real DB behavior.
 */
function makeRepos(overrides: {
  draft?: DraftStatement | null
  figure?: PublicFigure | null
  organisation?: Organisation | null
  subject?: Subject | null
  positions?: Position[]
  arguments?: Argument[]
  occupations?: Occupation[]
  memberships?: OrganisationMembership[]
}) {
  const createdFigures = new Map<string, PublicFigure>()
  const createdSubjects = new Map<string, Subject>()
  const createdPositions = new Map<string, Position>()

  const draftRepo = {
    findById: vi.fn(() => Effect.succeed('draft' in overrides ? overrides.draft : makeDraft())),
    updateStatus: vi.fn(() => Effect.succeed(undefined)),
  } as unknown as DraftStatementRepository & {
    findById: ReturnType<typeof vi.fn>
    updateStatus: ReturnType<typeof vi.fn>
  }

  const publicFigureRepo = {
    findBySlug: vi.fn(() => Effect.succeed(overrides.figure ?? null)),
    findById: vi.fn((id: string) =>
      Effect.succeed(
        overrides.figure?.id === id ? overrides.figure : (createdFigures.get(id) ?? null),
      ),
    ),
    findByWikipediaUrl: vi.fn(() => Effect.succeed(null)),
    create: vi.fn((pf: PublicFigure) => {
      createdFigures.set(pf.id, pf)
      return Effect.succeed(pf)
    }),
  } as unknown as PublicFigureRepository & {
    findBySlug: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }

  const organisationRepo = fakeOrganisationRepo(
    overrides.organisation ? [overrides.organisation] : [],
  )
  vi.spyOn(organisationRepo, 'create')

  const subjectRepo = {
    findBySlug: vi.fn(() => Effect.succeed(overrides.subject ?? null)),
    findById: vi.fn((id: string) =>
      Effect.succeed(
        overrides.subject?.id === id ? overrides.subject : (createdSubjects.get(id) ?? null),
      ),
    ),
    create: vi.fn((s: Subject) => {
      createdSubjects.set(s.id, s)
      return Effect.succeed(s)
    }),
  } as unknown as SubjectRepository & {
    findBySlug: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }

  const positionRepo = {
    findBySubjectId: vi.fn(() => Effect.succeed(overrides.positions ?? [])),
    findById: vi.fn((id: string) => {
      const fromOverrides = (overrides.positions ?? []).find((p) => p.id === id)
      return Effect.succeed(fromOverrides ?? createdPositions.get(id) ?? null)
    }),
    create: vi.fn((p: Position) => {
      createdPositions.set(p.id, p)
      return Effect.succeed(p)
    }),
  } as unknown as PositionRepository & {
    findBySubjectId: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }

  const unit = inMemoryUnitOfWork()

  const reputationRepo = {
    recordEvent: vi.fn(() => Effect.succeed(undefined)),
  } as unknown as ReputationRepository & {
    recordEvent: ReturnType<typeof vi.fn>
  }

  const seededFigures = overrides.figure ? [overrides.figure] : []
  const seededOrganisations = overrides.organisation ? [overrides.organisation] : []

  return {
    draftRepo,
    publicFigureRepo,
    organisationRepo: organisationRepo as typeof organisationRepo & {
      create: ReturnType<typeof vi.fn>
    },
    subjectRepo,
    positionRepo,
    runUnitOfWork: unit.run,
    journal: unit.journal,
    argumentRepo: fakeArgumentRepo(overrides.arguments ?? []),
    occupationRepo: fakeOccupationRepo(overrides.occupations ?? []),
    membershipRepo: fakeMembershipRepo(
      overrides.memberships ?? [],
      seededFigures,
      seededOrganisations,
    ),
    reputationRepo,
  }
}

describe('validateDraft', () => {
  it('should fail when draft is not found', async () => {
    const repos = makeRepos({ draft: null })
    const result = await validateDraft({
      draftId: 'draft-1',
      contributor: ADMIN,
      ...repos,
      wikipediaValidator: fakeWikipediaValidator,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('introuvable')
    }
  })

  it('should create all entities via use cases when none exist', async () => {
    const repos = makeRepos({})
    const result = await validateDraft({
      draftId: 'draft-1',
      contributor: ADMIN,
      ...repos,
      wikipediaValidator: fakeWikipediaValidator,
    })

    expect(Either.isRight(result)).toBe(true)
    expect(repos.publicFigureRepo.create).toHaveBeenCalledOnce()
    expect(repos.subjectRepo.create).toHaveBeenCalledOnce()
    expect(repos.positionRepo.create).toHaveBeenCalledOnce()
    expect(repos.journal.all().map((e) => e.type)).toEqual(['StatementAdded'])
    expect(repos.draftRepo.updateStatus).toHaveBeenCalledWith('draft-1', 'validated')
  })

  it('should reuse existing entities when they are found', async () => {
    const figure = makePublicFigure()
    const subject = makeSubject()
    const position = makePosition()
    const repos = makeRepos({ figure, subject, positions: [position] })
    const result = await validateDraft({
      draftId: 'draft-1',
      contributor: ADMIN,
      ...repos,
      wikipediaValidator: fakeWikipediaValidator,
    })

    expect(Either.isRight(result)).toBe(true)
    expect(repos.publicFigureRepo.create).not.toHaveBeenCalled()
    expect(repos.subjectRepo.create).not.toHaveBeenCalled()
    expect(repos.positionRepo.create).not.toHaveBeenCalled()
    expect(repos.journal.all().map((e) => e.type)).toEqual(['StatementAdded'])
    expect(repos.draftRepo.updateStatus).toHaveBeenCalledWith('draft-1', 'validated')
  })

  it('should fail when entity is missing and no creation data', async () => {
    const repos = makeRepos({
      draft: makeDraft({ author: draftPublicFigureAuthor('Jean-Luc Mélenchon') }),
    })
    const result = await validateDraft({
      draftId: 'draft-1',
      contributor: ADMIN,
      ...repos,
      wikipediaValidator: fakeWikipediaValidator,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('personnalité')
    }
  })

  it('should record reputation events via use cases', async () => {
    const repos = makeRepos({})
    await validateDraft({
      draftId: 'draft-1',
      contributor: ADMIN,
      ...repos,
      wikipediaValidator: fakeWikipediaValidator,
    })

    expect(repos.reputationRepo.recordEvent).toHaveBeenCalled()
  })

  it('should create the organisation when the drafted author does not exist', async () => {
    const repos = makeRepos({ draft: makeOrganisationDraft() })
    const result = await validateDraft({
      draftId: 'draft-1',
      contributor: ADMIN,
      ...repos,
      wikipediaValidator: fakeWikipediaValidator,
    })

    expect(Either.isRight(result)).toBe(true)
    expect(repos.organisationRepo.create).toHaveBeenCalledOnce()
    expect(repos.publicFigureRepo.create).not.toHaveBeenCalled()
    expect(repos.journal.all().map((e) => e.type)).toEqual(['StatementAdded'])
  })

  it('should attribute the statement to the organisation', async () => {
    const organisation = sampleOrganisation()
    const repos = makeRepos({ draft: makeOrganisationDraft(), organisation })
    const result = await validateDraft({
      draftId: 'draft-1',
      contributor: ADMIN,
      ...repos,
      wikipediaValidator: fakeWikipediaValidator,
    })

    expect(Either.isRight(result)).toBe(true)
    expect(repos.organisationRepo.create).not.toHaveBeenCalled()
    expect(repos.journal.all()[0].payload).toMatchObject({
      author: { kind: 'organisation', id: organisation.id },
    })
  })

  it('should fail when the organisation is missing and no creation data', async () => {
    const repos = makeRepos({
      draft: makeOrganisationDraft({ author: draftOrganisationAuthor('Attac France') }),
    })
    const result = await validateDraft({
      draftId: 'draft-1',
      contributor: ADMIN,
      ...repos,
      wikipediaValidator: fakeWikipediaValidator,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('organisation')
    }
  })

  it('should keep the drafted statement type instead of always declaring', async () => {
    const repos = makeRepos({ draft: makeDraft({ statementType: 'program' }) })
    const result = await validateDraft({
      draftId: 'draft-1',
      contributor: ADMIN,
      ...repos,
      wikipediaValidator: fakeWikipediaValidator,
    })

    expect(Either.isRight(result)).toBe(true)
    expect(repos.journal.all()[0].payload).toMatchObject({ statementType: 'program' })
  })

  describe('the arguments the draft carries', () => {
    it('should reuse an argument the site already knows, whatever its case', async () => {
      const known = sampleArgument('Risque d’exil fiscal')
      const repos = makeRepos({
        arguments: [known],
        draft: makeDraft({ arguments: [{ title: 'RISQUE D’EXIL FISCAL' }] }),
      })

      const result = await validateDraft({
        draftId: 'draft-1',
        contributor: ADMIN,
        ...repos,
        wikipediaValidator: fakeWikipediaValidator,
      })

      expect(Either.isRight(result)).toBe(true)
      expect(repos.argumentRepo.rows).toHaveLength(1)
      expect(repos.journal.all()[0].payload).toMatchObject({ argumentIds: [known.id] })
    })

    it('should create an argument the site does not know yet', async () => {
      const repos = makeRepos({
        draft: makeDraft({
          arguments: [{ title: 'Baisse de la dépense publique', description: 'Dépenser moins.' }],
        }),
      })

      const result = await validateDraft({
        draftId: 'draft-1',
        contributor: ADMIN,
        ...repos,
        wikipediaValidator: fakeWikipediaValidator,
      })

      expect(Either.isRight(result)).toBe(true)
      expect(repos.argumentRepo.rows).toMatchObject([
        { title: 'Baisse de la dépense publique', description: 'Dépenser moins.' },
      ])
    })

    it('should mobilise nothing when the statement only asserts', async () => {
      const repos = makeRepos({})

      await validateDraft({
        draftId: 'draft-1',
        contributor: ADMIN,
        ...repos,
        wikipediaValidator: fakeWikipediaValidator,
      })

      expect(repos.argumentRepo.rows).toHaveLength(0)
      expect(repos.journal.all()[0].payload).toMatchObject({ argumentIds: [] })
    })
  })

  describe('the occupations of the public figure author', () => {
    it('should assign the occupations the draft names', async () => {
      const figure = makePublicFigure()
      const economist = sampleOccupation('Économiste')
      const repos = makeRepos({
        figure,
        occupations: [economist],
        draft: makeDraft({ occupations: [{ name: 'Économiste', current: true }] }),
      })

      const result = await validateDraft({
        draftId: 'draft-1',
        contributor: ADMIN,
        ...repos,
        wikipediaValidator: fakeWikipediaValidator,
      })

      expect(Either.isRight(result)).toBe(true)
      expect(repos.occupationRepo.assignments.get(figure.id)).toEqual([
        { occupationId: economist.id, current: true },
      ])
    })

    it('should add to the occupations the figure already holds, not replace them', async () => {
      const figure = makePublicFigure()
      const economist = sampleOccupation('Économiste')
      const essayist = sampleOccupation('Essayiste')
      const repos = makeRepos({
        figure,
        occupations: [economist, essayist],
        draft: makeDraft({ occupations: [{ name: 'Essayiste', current: true }] }),
      })
      repos.occupationRepo.assignments.set(figure.id, [
        { occupationId: economist.id, current: true },
      ])

      await validateDraft({
        draftId: 'draft-1',
        contributor: ADMIN,
        ...repos,
        wikipediaValidator: fakeWikipediaValidator,
      })

      expect(repos.occupationRepo.assignments.get(figure.id)).toEqual([
        { occupationId: economist.id, current: true },
        { occupationId: essayist.id, current: true },
      ])
    })

    it('should refuse an occupation that is not on the closed list', async () => {
      const repos = makeRepos({
        figure: makePublicFigure(),
        occupations: [sampleOccupation('Économiste')],
        draft: makeDraft({ occupations: [{ name: 'Directrice de think tank', current: true }] }),
      })

      const result = await validateDraft({
        draftId: 'draft-1',
        contributor: ADMIN,
        ...repos,
        wikipediaValidator: fakeWikipediaValidator,
      })

      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toContain('Directrice de think tank')
      }
    })
  })

  describe('the organisations the public figure author belongs to', () => {
    it('should affiliate the figure to an organisation the catalogue knows', async () => {
      const figure = makePublicFigure()
      const organisation = sampleOrganisation()
      const repos = makeRepos({
        figure,
        organisation,
        draft: makeDraft({
          affiliations: [{ organisation: organisation.name, role: 'porte-parole' }],
        }),
      })

      const result = await validateDraft({
        draftId: 'draft-1',
        contributor: ADMIN,
        ...repos,
        wikipediaValidator: fakeWikipediaValidator,
      })

      expect(Either.isRight(result)).toBe(true)
      expect(repos.membershipRepo.rows).toMatchObject([
        {
          organisationId: organisation.id,
          publicFigureId: figure.id,
          role: Option.some('porte-parole'),
        },
      ])
    })

    it('should create an organisation the affiliation names and the catalogue lacks', async () => {
      const figure = makePublicFigure()
      const repos = makeRepos({
        figure,
        draft: makeDraft({
          affiliations: [
            {
              organisation: 'Fondation iFRAP',
              // No Wikipedia page here: the shared validator reports a
              // biography, which the domain refuses for an organisation.
              organisationData: {
                presentation: 'Think tank libéral consacré aux finances publiques.',
                organisationType: 'association',
                notorietySources: ['https://lemonde.fr/ifrap', 'https://liberation.fr/ifrap'],
              },
            },
          ],
        }),
      })

      const result = await validateDraft({
        draftId: 'draft-1',
        contributor: ADMIN,
        ...repos,
        wikipediaValidator: fakeWikipediaValidator,
      })

      expect(Either.isRight(result)).toBe(true)
      expect(repos.organisationRepo.create).toHaveBeenCalledOnce()
      expect(repos.membershipRepo.rows).toHaveLength(1)
    })

    it('should fail when the organisation is unknown and the draft gives no data', async () => {
      const repos = makeRepos({
        figure: makePublicFigure(),
        draft: makeDraft({ affiliations: [{ organisation: 'Fondation iFRAP' }] }),
      })

      const result = await validateDraft({
        draftId: 'draft-1',
        contributor: ADMIN,
        ...repos,
        wikipediaValidator: fakeWikipediaValidator,
      })

      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toContain('Fondation iFRAP')
      }
    })

    it('should leave an affiliation that is already current alone', async () => {
      const figure = makePublicFigure()
      const organisation = sampleOrganisation()
      const existing = createMembership({
        organisationId: organisation.id,
        publicFigureId: figure.id,
        role: 'adhérente',
        createdBy: 'founder',
      })
      const repos = makeRepos({
        figure,
        organisation,
        memberships: [existing],
        draft: makeDraft({ affiliations: [{ organisation: organisation.name }] }),
      })

      const result = await validateDraft({
        draftId: 'draft-1',
        contributor: ADMIN,
        ...repos,
        wikipediaValidator: fakeWikipediaValidator,
      })

      expect(Either.isRight(result)).toBe(true)
      expect(repos.membershipRepo.rows).toEqual([existing])
    })
  })
})
