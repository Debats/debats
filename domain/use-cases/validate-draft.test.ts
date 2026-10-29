import { describe, it, expect, vi } from 'vitest'
import { Effect, Either, Layer } from 'effect'
import { validateDraft } from './validate-draft'
import { runWith } from './command-test-helpers'
import { ArgumentRepository } from '../repositories/argument-repository'
import { OccupationRepository } from '../repositories/occupation-repository'
import { OrganisationMembershipRepository } from '../repositories/organisation-membership-repository'
import { SubjectSource } from './subject-stream'
import {
  DraftStatement,
  draftOrganisationAuthor,
  draftPublicFigureAuthor,
} from '../entities/draft-statement'
import { DraftStatementRepository } from '../repositories/draft-statement-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { SubjectRepository } from '../repositories/subject-repository'
import { PositionRepository } from '../repositories/position-repository'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { PublicFigure } from '../entities/public-figure'
import { Organisation } from '../entities/organisation'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { replayOrganisation } from '../aggregates/organisation'
import { replayPublicFigure } from '../aggregates/public-figure'
import {
  fakeMembershipRepo,
  fakeOrganisationRepo,
  sampleOrganisation,
} from './organisation-test-helpers'
import { fakeSubjectSource, subjectParts } from './subject-test-helpers'
import { figureParts } from './public-figure-test-helpers'
import { PublicFigureSource } from './public-figure-stream'
import { fakeArgumentRepo, sampleArgument } from './argument-test-helpers'
import { fakeOccupationRepo, sampleOccupation } from './occupation-test-helpers'
import { Argument } from '../entities/argument'
import { Occupation } from '../entities/occupation'
import { createMembership, OrganisationMembership } from '../entities/organisation-membership'
import { Subject } from '../entities/subject'
import { Position, PositionId, PositionSlug, PositionTitle } from '../entities/position'
import { ContributorIdentity } from './types'
import { deedsIn, grantsIn } from './contributor-test-helpers'
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
  const unit = inMemoryUnitOfWork()

  /** The stream of one aggregate as the journal holds it after the validation */
  const streamOf = (streamType: string, id: string) =>
    unit.journal.all().filter((e) => e.streamType === streamType && e.streamId === id)

  /** A figure added through the journal during the validation, as the table would then hold her */
  const figureFromJournal = (id: string): PublicFigure | null => {
    const state = replayPublicFigure(streamOf('public_figure', id))
    return Either.isRight(state) ? (state.right?.figure ?? null) : null
  }

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
      Effect.succeed(overrides.figure?.id === id ? overrides.figure : figureFromJournal(id)),
    ),
    findByWikipediaUrl: vi.fn(() => Effect.succeed(null)),
  } as unknown as PublicFigureRepository & {
    findBySlug: ReturnType<typeof vi.fn>
  }

  /** An organisation added through the journal during the validation, as the table would then hold it */
  const organisationFromJournal = (id: string): Organisation | null => {
    const state = replayOrganisation(streamOf('organisation', id))
    return Either.isRight(state) ? (state.right?.organisation ?? null) : null
  }

  const seededOrganisations = overrides.organisation ? [overrides.organisation] : []
  const organisationRepo: OrganisationRepository = {
    ...fakeOrganisationRepo(seededOrganisations),
    findById: (id) =>
      Effect.succeed(seededOrganisations.find((o) => o.id === id) ?? organisationFromJournal(id)),
  }

  const subjectRepo = {
    findBySlug: vi.fn(() => Effect.succeed(overrides.subject ?? null)),
    findById: vi.fn((id: string) =>
      Effect.succeed(overrides.subject?.id === id ? overrides.subject : null),
    ),
  } as unknown as SubjectRepository & {
    findBySlug: ReturnType<typeof vi.fn>
  }

  /** A position added through the journal during the validation, as the table would then hold it */
  const positionFromJournal = (id: string): Position | null => {
    const added = unit.journal
      .all()
      .find(
        (e) =>
          e.type === 'PositionAdded' && (e.payload as { positionId: string }).positionId === id,
      )
    if (!added) return null
    const payload = added.payload as { title: string; slug: string; description: string }
    return Position.make({
      id: PositionId.make(id),
      title: PositionTitle.make(payload.title),
      slug: PositionSlug.make(payload.slug),
      description: payload.description,
      subjectId: added.streamId,
      createdAt: added.occurredAt,
      updatedAt: added.occurredAt,
    })
  }

  const positionRepo = {
    findBySubjectId: vi.fn(() => Effect.succeed(overrides.positions ?? [])),
    findById: vi.fn((id: string) =>
      Effect.succeed(
        (overrides.positions ?? []).find((p) => p.id === id) ?? positionFromJournal(id),
      ),
    ),
  } as unknown as PositionRepository & {
    findBySubjectId: ReturnType<typeof vi.fn>
  }
  const subjectSource = fakeSubjectSource(
    overrides.subject ? [subjectParts(overrides.subject, overrides.positions ?? [])] : [],
  )

  const seededFigures = overrides.figure ? [overrides.figure] : []
  const occupationRepo = fakeOccupationRepo(overrides.occupations ?? [])

  /** The figure as the tables would hold her when a command imports her on demand */
  const publicFigureSource: PublicFigureSource = (id) =>
    Effect.succeed(
      overrides.figure?.id === id
        ? figureParts(overrides.figure, {
            occupations: occupationRepo.assignments.get(id) ?? [],
            memberships: overrides.memberships ?? [],
          })
        : null,
    )

  const services = Layer.mergeAll(
    Layer.succeed(DraftStatementRepository, draftRepo),
    Layer.succeed(PublicFigureRepository, publicFigureRepo),
    Layer.succeed(OrganisationRepository, organisationRepo),
    Layer.succeed(SubjectRepository, subjectRepo),
    Layer.succeed(PositionRepository, positionRepo),
    Layer.succeed(SubjectSource, subjectSource),
    Layer.succeed(PublicFigureSource, publicFigureSource),
    Layer.succeed(ArgumentRepository, fakeArgumentRepo(overrides.arguments ?? [])),
    Layer.succeed(OccupationRepository, occupationRepo),
    Layer.succeed(
      OrganisationMembershipRepository,
      fakeMembershipRepo(overrides.memberships ?? [], seededFigures, seededOrganisations),
    ),
    Layer.succeed(WikipediaValidator, fakeWikipediaValidator),
  )

  return {
    draftRepo,
    journal: unit.journal,
    occupationRepo,
    /** The validation of the draft, by this contributor, against these tables and this journal */
    validate: (contributor: ContributorIdentity | null) =>
      runWith(services)(validateDraft({ draftId: 'draft-1', contributor }), unit.run),
  }
}

/** The events of one type the validation wrote, by payload */
const payloadsOf = (journal: { all(): Array<{ type: string; payload: unknown }> }, type: string) =>
  journal
    .all()
    .filter((e) => e.type === type)
    .map((e) => e.payload)

describe('validateDraft', () => {
  it('refuses a visitor, and a contributor below the founder rank, before reading the draft', async () => {
    const repos = makeRepos({})
    const visitor = await repos.validate(null)
    const ideologue = await repos.validate({ id: 'user-2', reputation: 1_000 })

    expect(Either.isLeft(visitor) && visitor.left).toContain('connecté')
    expect(Either.isLeft(ideologue) && ideologue.left).toContain('Fondateur')
    expect(repos.journal.all()).toEqual([])
    expect(repos.draftRepo.updateStatus).not.toHaveBeenCalled()
  })

  it('should fail when draft is not found', async () => {
    const repos = makeRepos({ draft: null })
    const result = await repos.validate(ADMIN)

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('introuvable')
    }
  })

  it('should create all entities via use cases when none exist', async () => {
    const repos = makeRepos({})
    const result = await repos.validate(ADMIN)

    expect(Either.isRight(result)).toBe(true)
    expect(deedsIn(repos.journal).map((e) => e.type)).toEqual([
      'PublicFigureAdded',
      'SubjectAdded',
      'PositionAdded',
      'StatementAdded',
    ])
    expect(repos.draftRepo.updateStatus).toHaveBeenCalledWith('draft-1', 'validated')
  })

  it('should reuse existing entities when they are found', async () => {
    const figure = makePublicFigure()
    const subject = makeSubject()
    const position = makePosition()
    const repos = makeRepos({ figure, subject, positions: [position] })
    const result = await repos.validate(ADMIN)

    expect(Either.isRight(result)).toBe(true)
    expect(deedsIn(repos.journal).map((e) => e.type)).toEqual(['StatementAdded'])
    expect(repos.draftRepo.updateStatus).toHaveBeenCalledWith('draft-1', 'validated')
  })

  it('should fail when entity is missing and no creation data', async () => {
    const repos = makeRepos({
      draft: makeDraft({ author: draftPublicFigureAuthor('Jean-Luc Mélenchon') }),
    })
    const result = await repos.validate(ADMIN)

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('personnalité')
    }
  })

  it('should record reputation events via use cases', async () => {
    const repos = makeRepos({})
    await repos.validate(ADMIN)

    expect(grantsIn(repos.journal).map((g) => g[1])).toContain('added_statement_validated')
  })

  it('should create the organisation when the drafted author does not exist', async () => {
    const repos = makeRepos({ draft: makeOrganisationDraft() })
    const result = await repos.validate(ADMIN)

    expect(Either.isRight(result)).toBe(true)
    expect(payloadsOf(repos.journal, 'OrganisationAdded')).toHaveLength(1)
    expect(payloadsOf(repos.journal, 'PublicFigureAdded')).toEqual([])
    expect(deedsIn(repos.journal).at(-1)?.type).toBe('StatementAdded')
  })

  it('should attribute the statement to the organisation', async () => {
    const organisation = sampleOrganisation()
    const repos = makeRepos({ draft: makeOrganisationDraft(), organisation })
    const result = await repos.validate(ADMIN)

    expect(Either.isRight(result)).toBe(true)
    expect(payloadsOf(repos.journal, 'OrganisationAdded')).toEqual([])
    expect(deedsIn(repos.journal).at(-1)?.payload).toMatchObject({
      author: { kind: 'organisation', id: organisation.id },
    })
  })

  it('should fail when the organisation is missing and no creation data', async () => {
    const repos = makeRepos({
      draft: makeOrganisationDraft({ author: draftOrganisationAuthor('Attac France') }),
    })
    const result = await repos.validate(ADMIN)

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('organisation')
    }
  })

  it('should keep the drafted statement type instead of always declaring', async () => {
    const repos = makeRepos({ draft: makeDraft({ statementType: 'program' }) })
    const result = await repos.validate(ADMIN)

    expect(Either.isRight(result)).toBe(true)
    expect(deedsIn(repos.journal).at(-1)?.payload).toMatchObject({ statementType: 'program' })
  })

  describe('the arguments the draft carries', () => {
    it('should reuse an argument the site already knows, whatever its case', async () => {
      const known = sampleArgument('Risque d’exil fiscal')
      const repos = makeRepos({
        arguments: [known],
        draft: makeDraft({ arguments: [{ title: 'RISQUE D’EXIL FISCAL' }] }),
      })

      const result = await repos.validate(ADMIN)

      expect(Either.isRight(result)).toBe(true)
      expect(payloadsOf(repos.journal, 'ArgumentAdded')).toEqual([])
      expect(deedsIn(repos.journal).at(-1)?.payload).toMatchObject({ argumentIds: [known.id] })
    })

    it('should create an argument the site does not know yet', async () => {
      const repos = makeRepos({
        draft: makeDraft({
          arguments: [{ title: 'Baisse de la dépense publique', description: 'Dépenser moins.' }],
        }),
      })

      const result = await repos.validate(ADMIN)

      expect(Either.isRight(result)).toBe(true)
      expect(payloadsOf(repos.journal, 'ArgumentAdded')).toEqual([
        {
          title: 'Baisse de la dépense publique',
          slug: 'baisse-de-la-depense-publique',
          description: 'Dépenser moins.',
        },
      ])
    })

    it('should mobilise nothing when the statement only asserts', async () => {
      const repos = makeRepos({})

      await repos.validate(ADMIN)

      expect(payloadsOf(repos.journal, 'ArgumentAdded')).toEqual([])
      expect(deedsIn(repos.journal).at(-1)?.payload).toMatchObject({ argumentIds: [] })
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

      const result = await repos.validate(ADMIN)

      expect(Either.isRight(result)).toBe(true)
      expect(payloadsOf(repos.journal, 'OccupationsSet')).toEqual([
        { occupations: [{ occupationId: economist.id, current: true }] },
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

      await repos.validate(ADMIN)

      expect(payloadsOf(repos.journal, 'OccupationsSet').at(-1)).toEqual({
        occupations: [
          { occupationId: economist.id, current: true },
          { occupationId: essayist.id, current: true },
        ],
      })
    })

    it('should refuse an occupation that is not on the closed list', async () => {
      const repos = makeRepos({
        figure: makePublicFigure(),
        occupations: [sampleOccupation('Économiste')],
        draft: makeDraft({ occupations: [{ name: 'Directrice de think tank', current: true }] }),
      })

      const result = await repos.validate(ADMIN)

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

      const result = await repos.validate(ADMIN)

      expect(Either.isRight(result)).toBe(true)
      expect(repos.journal.all().filter((e) => e.type === 'MembershipAdded')).toMatchObject([
        { streamId: figure.id, payload: { organisationId: organisation.id, role: 'porte-parole' } },
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

      const result = await repos.validate(ADMIN)

      expect(Either.isRight(result)).toBe(true)
      expect(payloadsOf(repos.journal, 'OrganisationAdded')).toHaveLength(1)
      expect(payloadsOf(repos.journal, 'MembershipAdded')).toHaveLength(1)
    })

    it('should fail when the organisation is unknown and the draft gives no data', async () => {
      const repos = makeRepos({
        figure: makePublicFigure(),
        draft: makeDraft({ affiliations: [{ organisation: 'Fondation iFRAP' }] }),
      })

      const result = await repos.validate(ADMIN)

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

      const result = await repos.validate(ADMIN)

      expect(Either.isRight(result)).toBe(true)
      expect(payloadsOf(repos.journal, 'MembershipAdded')).toEqual([])
    })
  })
})
