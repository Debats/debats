import { describe, it, expect } from 'vitest'
import { Either, Effect, Layer, Option } from 'effect'
import { createStatementUseCase } from './create-statement'
import { EMPTY_CONTENT_INPUT } from './validate-statement-fields'
import { organisationAuthor, publicFigureAuthor } from '../entities/statement'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { ArgumentRepository } from '../repositories/argument-repository'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { PositionRepository } from '../repositories/position-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import {
  fakeOrganisationRepo,
  fakeWikipediaValidator,
  sampleOrganisation,
} from './organisation-test-helpers'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { fakeArgumentRepo, sampleArgument } from './argument-test-helpers'
import { Position, PositionId, PositionSlug, PositionTitle } from '../entities/position'
import { deedsIn, grantsIn } from './contributor-test-helpers'
import { runFormWith } from './command-test-helpers'
import { SubjectRepository } from '../repositories/subject-repository'
import { journalWithSubjects, sampleSubject } from './subject-test-helpers'
import {
  PublicFigure,
  PublicFigureId,
  PublicFigureName,
  PublicFigureSlug,
} from '../entities/public-figure'

const fakePosition = Position.make({
  id: PositionId.make('pos-1'),
  title: PositionTitle.make('Pour la mesure'),
  slug: PositionSlug.make('pour-la-mesure'),
  description: 'Description suffisamment longue pour être valide.',
  subjectId: 'subject-1',
  createdAt: new Date(),
  updatedAt: new Date(),
})

const fakePublicFigure = PublicFigure.make({
  id: PublicFigureId.make('figure-1'),
  name: PublicFigureName.make('Jean Dupont'),
  slug: PublicFigureSlug.make('jean-dupont'),
  presentation: 'Un personnage public suffisamment connu.',
  wikipediaUrl: Option.some('https://fr.wikipedia.org/wiki/Jean_Dupont'),
  notorietySources: [],
  websiteUrl: Option.none(),
  createdBy: 'someone',
  createdAt: new Date(),
  updatedAt: new Date(),
})

const fakePositionRepo: PositionRepository = {
  findById: () => Effect.succeed(fakePosition as Position | null),
  findBySubjectAndSlug: () => Effect.succeed(null as Position | null),
  findBySubjectId: () => Effect.succeed([fakePosition]),
}

const fakePublicFigureRepo = {
  findAll: () => Effect.succeed([fakePublicFigure]),
  searchByName: () => Effect.succeed([]),
  findBySlug: () => Effect.succeed(fakePublicFigure as PublicFigure | null),
  findById: () => Effect.succeed(fakePublicFigure as PublicFigure | null),
  findByWikipediaUrl: () => Effect.succeed(null as PublicFigure | null),
  getStats: () =>
    Effect.succeed({ publicFigureId: '', subjectsCount: 0, positionsCount: 0, statementsCount: 0 }),
  findSummariesByCreatedAt: () => Effect.succeed([]),
  findSummaryById: () => Effect.succeed(null),
  findSummariesByIds: () => Effect.succeed([]),
  findIndexEntries: () => Effect.succeed([]),
  findAllIds: () => Effect.succeed([]),
  findIdsWithoutPrimaryTheme: () => Effect.succeed([]),
} as unknown as PublicFigureRepository

const organisation = sampleOrganisation()

/** Une page qui ne décrit pas une personne : ce qu'une organisation doit présenter */
const pageIsNotAPerson = fakeWikipediaValidator({
  exists: true,
  isArticle: true,
  isBiography: false,
})

/** A subject of the site, with one of its positions ticked */
const onSubject = (subjectId: string, positionId: string) =>
  ({
    kind: 'existing',
    subjectId,
    position: { kind: 'existing', id: positionId },
  }) as const

/** A subject of the site, with a position proposed on it */
const proposingOn = (
  subjectId: string,
  position: { positionTitle: string; positionDescription: string },
) => ({ kind: 'existing', subjectId, position: { kind: 'new', ...position } }) as const

const validParams = {
  author: { kind: 'existing' as const, author: publicFigureAuthor('figure-1') },
  topic: onSubject('subject-1', 'pos-1'),
  arguments: { argumentIds: [] as string[], newArguments: [] },
  content: {
    ...EMPTY_CONTENT_INPUT,
    quote: 'Une citation suffisamment longue pour être valide.',
  },
  sourceName: 'Le Monde',
  sourceUrl: 'https://lemonde.fr/article',
  statedAt: '2024-01-15',
}

/** The read side as the test wants it */
const fakes = (
  overrides: {
    positions?: PositionRepository
    figures?: PublicFigureRepository
    organisations?: OrganisationRepository
    arguments?: ArgumentRepository
    wikipedia?: WikipediaValidator
    subjects?: SubjectRepository
  } = {},
) =>
  Layer.mergeAll(
    /* Only read to tell a free title from a taken one, when a subject is created here */
    Layer.succeed(
      SubjectRepository,
      overrides.subjects ??
        ({ findBySlug: () => Effect.succeed(null) } as unknown as SubjectRepository),
    ),
    Layer.succeed(PositionRepository, overrides.positions ?? fakePositionRepo),
    Layer.succeed(PublicFigureRepository, overrides.figures ?? fakePublicFigureRepo),
    Layer.succeed(
      OrganisationRepository,
      overrides.organisations ?? fakeOrganisationRepo([organisation]),
    ),
    Layer.succeed(ArgumentRepository, overrides.arguments ?? fakeArgumentRepo()),
    Layer.succeed(
      WikipediaValidator,
      overrides.wikipedia ??
        fakeWikipediaValidator({ exists: true, isArticle: true, isBiography: true }),
    ),
  )

const execute = runFormWith(fakes())

describe('createStatementUseCase', () => {
  it('should refuse arguments from a contributor below the Éloquent rank', async () => {
    const argument = sampleArgument()
    const result = await runFormWith(fakes({ arguments: fakeArgumentRepo([argument]) }))(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 0 },
        arguments: { argumentIds: [argument.id], newArguments: [] },
      }),
    )

    expect(Either.isLeft(result) && result.left).toContain('Éloquent')
  })

  it('should create proposed arguments and carry every argument in the event', async () => {
    const argument = sampleArgument()
    const { run, journal } = inMemoryUnitOfWork()
    const result = await runFormWith(fakes({ arguments: fakeArgumentRepo([argument]) }))(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 1000 },
        arguments: {
          argumentIds: [argument.id],
          newArguments: [
            { title: 'Liberté de choix', description: 'Chacun décide pour lui-même.' },
          ],
        },
      }),
      run,
    )

    expect(Either.isRight(result)).toBe(true)
    const [proposed, statement] = journal.all()
    expect(proposed).toMatchObject({
      streamType: 'argument',
      type: 'ArgumentAdded',
      actorId: 'abc',
      payload: { title: 'Liberté de choix', slug: 'liberte-de-choix' },
    })
    expect(statement.payload).toMatchObject({ argumentIds: [argument.id, proposed.streamId] })
  })

  it('writes a new position and the statement in the same transaction, and rewards both', async () => {
    // A Métèque may propose a position: naming one describes the debate, it does not settle it
    const subject = sampleSubject()
    const { run, journal } = await journalWithSubjects([subject, []])

    const result = await runFormWith(fakes())(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 0 },
        topic: proposingOn(subject.id, {
          positionTitle: 'Pour une aide active à mourir',
          positionDescription: 'Le geste létal est accompli par le corps médical, sous conditions.',
        }),
      }),
      run,
    )

    expect(Either.isRight(result)).toBe(true)
    const [position, statement] = deedsIn(journal).slice(-2)
    expect(position).toMatchObject({
      streamId: subject.id,
      type: 'PositionAdded',
      actorId: 'abc',
      payload: { title: 'Pour une aide active à mourir', slug: 'pour-une-aide-active-a-mourir' },
    })
    expect(statement).toMatchObject({ streamType: 'statement', type: 'StatementAdded' })
    // The statement hangs on the position just written, not on one looked up
    const { positionId } = position.payload as { positionId: string }
    expect(statement.payload).toMatchObject({ positionId })
    expect(grantsIn(journal)).toEqual([
      ['abc', 'added_position_validated', 50],
      ['abc', 'added_statement_validated', 50],
    ])
  })

  it('refuses a new position whose title is too short, naming the field', async () => {
    const subject = sampleSubject()
    const { run } = await journalWithSubjects([subject, []])

    const result = await runFormWith(fakes())(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 0 },
        topic: proposingOn(subject.id, {
          positionTitle: 'Ab',
          positionDescription: 'Une description assez longue.',
        }),
      }),
      run,
    )

    expect(
      Either.isLeft(result) && typeof result.left !== 'string' ? Object.keys(result.left) : [],
    ).toEqual(['positionTitle'])
  })

  it('says nothing was chosen rather than « introuvable » when no position was picked', async () => {
    // Un sujet sans position n'offre rien à cocher : le reproche serait injuste
    const result = await execute(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 0 },
        topic: onSubject('subject-1', ''),
      }),
    )

    expect(
      Either.isLeft(result) && typeof result.left !== 'string' ? result.left.positionId : null,
    ).toContain('Choisissez une position')
  })

  /* Without a subject the position cannot even be looked for: the fault is the subject's */
  it('blames the subject, not the position, when no subject was chosen', async () => {
    const result = await execute(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 0 },
        topic: onSubject('', 'pos-1'),
      }),
    )

    expect(
      Either.isLeft(result) && typeof result.left !== 'string' ? result.left : null,
    ).toMatchObject({ subjectId: expect.stringContaining('Choisissez un sujet') })
  })

  /** A subject created here, with the only position it can have: its first */
  const creating = (
    subject: { title: string; presentation: string; problem: string },
    position: { positionTitle: string; positionDescription: string },
  ) => ({ kind: 'new', subject, position }) as const

  const SMIC = {
    title: 'Le montant du SMIC',
    presentation: 'Le salaire minimum légal, et ce qu’il faudrait en faire.',
    problem: 'Faut-il augmenter le SMIC ?',
  }

  const FOR_A_RISE = {
    positionTitle: 'Pour une hausse du SMIC',
    positionDescription: 'Le salaire minimum doit suivre le coût de la vie.',
  }

  /** No subject of that title yet, which is what the command reads before writing */
  const titleIsFree = { findBySlug: () => Effect.succeed(null) } as unknown as SubjectRepository

  it('writes a subject, its first position and the statement in one transaction, and rewards the three', async () => {
    const { run, journal } = inMemoryUnitOfWork()

    const result = await runFormWith(fakes({ subjects: titleIsFree }))(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 1000 },
        topic: creating(SMIC, FOR_A_RISE),
      }),
      run,
    )

    expect(Either.isRight(result)).toBe(true)
    const [subject, position, statement] = deedsIn(journal).slice(-3)
    expect(subject).toMatchObject({
      streamType: 'subject',
      type: 'SubjectAdded',
      actorId: 'abc',
      payload: { title: 'Le montant du SMIC', slug: 'le-montant-du-smic' },
    })
    /* The position goes on the stream of the subject just opened, not on another */
    expect(position).toMatchObject({
      streamType: 'subject',
      streamId: subject.streamId,
      type: 'PositionAdded',
      payload: { title: 'Pour une hausse du SMIC' },
    })
    /* A stored payload is `unknown` by design — aggregates decode events, tests read them */
    const { positionId } = position.payload as { positionId: string }
    expect(statement).toMatchObject({
      streamType: 'statement',
      payload: { subjectId: subject.streamId, positionId },
    })
    expect(grantsIn(journal)).toEqual([
      ['abc', 'added_subject', 50],
      ['abc', 'added_position_validated', 50],
      ['abc', 'added_statement_validated', 50],
    ])
  })

  it('names the subject’s faults under their own fields, not the position’s', async () => {
    const result = await runFormWith(fakes({ subjects: titleIsFree }))(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 1000 },
        topic: creating({ title: 'Ab', presentation: 'Court', problem: 'Hein ?' }, FOR_A_RISE),
      }),
    )

    expect(
      Either.isLeft(result) && typeof result.left !== 'string' ? Object.keys(result.left) : null,
    ).toEqual(['subjectTitle', 'subjectPresentation', 'subjectProblem'])
  })

  it('refuses a subject whose title is taken, on the subject’s own field', async () => {
    const taken = {
      findBySlug: () => Effect.succeed(sampleSubject()),
    } as unknown as SubjectRepository

    const result = await runFormWith(fakes({ subjects: taken }))(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 1000 },
        topic: creating(SMIC, FOR_A_RISE),
      }),
    )

    expect(
      Either.isLeft(result) && typeof result.left !== 'string' ? result.left.subjectTitle : null,
    ).toContain('porte déjà ce titre')
  })

  it('writes nothing when the rank does not allow creating a subject', async () => {
    const { run, journal } = inMemoryUnitOfWork()

    const result = await runFormWith(fakes({ subjects: titleIsFree }))(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 0 },
        topic: creating(SMIC, FOR_A_RISE),
      }),
      run,
    )

    expect(Either.isLeft(result)).toBe(true)
    expect(journal.all().length).toBe(0)
  })

  it('opens a personality and her statement in the same transaction, and rewards both', async () => {
    // Le nom est libre : c'est ce que la commande vérifie avant d'écrire
    const nameIsFree = {
      ...fakePublicFigureRepo,
      findBySlug: () => Effect.succeed(null as PublicFigure | null),
    } as unknown as PublicFigureRepository
    const { run, journal } = inMemoryUnitOfWork()

    const result = await runFormWith(fakes({ figures: nameIsFree }))(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 1000 },
        author: {
          kind: 'new_figure',
          figure: {
            name: 'Marine Tondelier',
            presentation: 'Secrétaire nationale d’Europe Écologie Les Verts.',
            wikipediaUrl: 'https://fr.wikipedia.org/wiki/Marine_Tondelier',
            websiteUrl: '',
            notorietySources: [],
          },
        },
      }),
      run,
    )

    expect(Either.isRight(result)).toBe(true)
    const [figure, statement] = deedsIn(journal).slice(-2)
    expect(figure).toMatchObject({
      streamType: 'public_figure',
      type: 'PublicFigureAdded',
      actorId: 'abc',
      payload: { name: 'Marine Tondelier', slug: 'marine-tondelier' },
    })
    // La prise de position porte la personnalité qu'on vient d'ouvrir
    expect(statement).toMatchObject({
      streamType: 'statement',
      payload: { author: { kind: 'public_figure', id: figure.streamId } },
    })
    expect(grantsIn(journal)).toEqual([
      ['abc', 'added_personality_validated', 50],
      ['abc', 'added_statement_validated', 50],
    ])
  })

  it('refuses a personality under the Éloquent rank before ever asking Wikipedia', async () => {
    // Un validateur qui échoue le test s'il est appelé : le rang se juge d'abord
    const neverAsked: WikipediaValidator = {
      validatePage: () => {
        throw new Error('Wikipédia consulté avant le contrôle de rang')
      },
    }

    const result = await runFormWith(fakes({ wikipedia: neverAsked }))(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 0 },
        author: {
          kind: 'new_figure',
          figure: {
            name: 'Marine Tondelier',
            presentation: 'Secrétaire nationale d’Europe Écologie Les Verts.',
            wikipediaUrl: 'https://fr.wikipedia.org/wiki/Marine_Tondelier',
            websiteUrl: '',
            notorietySources: [],
          },
        },
      }),
    )

    expect(Either.isLeft(result) && result.left).toContain('Éloquent')
  })

  it('writes nothing when the Wikipedia page is refused: the judgement comes before the transaction', async () => {
    const noSuchPage = fakeWikipediaValidator({
      exists: false,
      isArticle: false,
      isBiography: false,
    })
    const { run, journal } = inMemoryUnitOfWork()

    const result = await runFormWith(fakes({ wikipedia: noSuchPage }))(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 1000 },
        author: {
          kind: 'new_figure',
          figure: {
            name: 'Marine Tondelier',
            presentation: 'Secrétaire nationale d’Europe Écologie Les Verts.',
            wikipediaUrl: 'https://fr.wikipedia.org/wiki/Marine_Tondelier',
            websiteUrl: '',
            notorietySources: [],
          },
        },
      }),
      run,
    )

    expect(
      Either.isLeft(result) && typeof result.left !== 'string'
        ? result.left.figureWikipediaUrl
        : null,
    ).toBeDefined()
    // Un appel réseau refusé n'a rien laissé derrière : il a lieu avant toute écriture
    expect(journal.all()).toEqual([])
  })

  it('names the personality’s faults under their own field, not the statement’s', async () => {
    const result = await runFormWith(fakes())(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 1000 },
        author: {
          kind: 'new_figure',
          figure: {
            name: 'A',
            presentation: 'Court',
            wikipediaUrl: '',
            websiteUrl: '',
            notorietySources: [],
          },
        },
      }),
    )

    expect(
      Either.isLeft(result) && typeof result.left !== 'string'
        ? Object.keys(result.left).sort()
        : [],
    ).toEqual(['figureName', 'figureNotorietySources', 'figurePresentation'])
  })

  it('opens an organisation and its statement in the same transaction, and rewards both', async () => {
    const nameIsFree = fakeOrganisationRepo([])
    const { run, journal } = inMemoryUnitOfWork()

    const result = await runFormWith(
      fakes({ organisations: nameIsFree, wikipedia: pageIsNotAPerson }),
    )(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 1000 },
        author: {
          kind: 'new_organisation',
          organisation: {
            name: 'Europe Écologie Les Verts',
            acronym: 'EELV',
            organisationType: 'political_party',
            presentation: 'Parti politique écologiste français.',
            wikipediaUrl: 'https://fr.wikipedia.org/wiki/Les_Écologistes',
            websiteUrl: '',
            notorietySources: [],
          },
        },
      }),
      run,
    )

    expect(Either.isRight(result)).toBe(true)
    const [organisation, statement] = deedsIn(journal).slice(-2)
    expect(organisation).toMatchObject({
      streamType: 'organisation',
      type: 'OrganisationAdded',
      actorId: 'abc',
      payload: { name: 'Europe Écologie Les Verts', acronym: 'EELV' },
    })
    expect(statement).toMatchObject({
      streamType: 'statement',
      payload: { author: { kind: 'organisation', id: organisation.streamId } },
    })
    expect(grantsIn(journal)).toEqual([
      ['abc', 'added_organisation_validated', 50],
      ['abc', 'added_statement_validated', 50],
    ])
  })

  it('names the organisation’s faults under their own fields, and keeps its type’s own name', async () => {
    const result = await runFormWith(fakes({ organisations: fakeOrganisationRepo([]) }))(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 1000 },
        author: {
          kind: 'new_organisation',
          organisation: {
            name: 'A',
            acronym: '',
            organisationType: '',
            presentation: 'Court',
            wikipediaUrl: '',
            websiteUrl: '',
            notorietySources: [],
          },
        },
      }),
    )

    expect(
      Either.isLeft(result) && typeof result.left !== 'string'
        ? Object.keys(result.left).sort()
        : [],
    ).toEqual([
      'organisationName',
      'organisationNotorietySources',
      'organisationPresentation',
      'organisationType',
    ])
  })

  it('refuses an organisation under the Éloquent rank before ever asking Wikipedia', async () => {
    const neverAsked: WikipediaValidator = {
      validatePage: () => {
        throw new Error('Wikipédia consulté avant le contrôle de rang')
      },
    }

    const result = await runFormWith(
      fakes({ organisations: fakeOrganisationRepo([]), wikipedia: neverAsked }),
    )(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 0 },
        author: {
          kind: 'new_organisation',
          organisation: {
            name: 'Europe Écologie Les Verts',
            acronym: 'EELV',
            organisationType: 'political_party',
            presentation: 'Parti politique écologiste français.',
            wikipediaUrl: 'https://fr.wikipedia.org/wiki/Les_Écologistes',
            websiteUrl: '',
            notorietySources: [],
          },
        },
      }),
    )

    expect(Either.isLeft(result) && result.left).toContain('Éloquent')
  })

  it('writes nothing when the organisation’s Wikipedia page describes a person', async () => {
    // Une page de personne ne décrit pas une organisation : le refus précède la transaction
    const pageIsAPerson = fakeWikipediaValidator({
      exists: true,
      isArticle: true,
      isBiography: true,
    })
    const { run, journal } = inMemoryUnitOfWork()

    const result = await runFormWith(
      fakes({ organisations: fakeOrganisationRepo([]), wikipedia: pageIsAPerson }),
    )(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 1000 },
        author: {
          kind: 'new_organisation',
          organisation: {
            name: 'Europe Écologie Les Verts',
            acronym: 'EELV',
            organisationType: 'political_party',
            presentation: 'Parti politique écologiste français.',
            wikipediaUrl: 'https://fr.wikipedia.org/wiki/Marine_Tondelier',
            websiteUrl: '',
            notorietySources: [],
          },
        },
      }),
      run,
    )

    expect(
      Either.isLeft(result) && typeof result.left !== 'string'
        ? result.left.organisationWikipediaUrl
        : null,
    ).toBeDefined()
    expect(journal.all()).toEqual([])
  })

  it('should fail when the organisation author is not found', async () => {
    const result = await execute(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 0 },
        author: { kind: 'existing', author: organisationAuthor('missing-org') },
      }),
    )

    expect(Either.isLeft(result) && result.left).toContain('organisation')
  })

  it('should create a statement authored by an organisation', async () => {
    const result = await execute(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 0 },
        author: { kind: 'existing', author: organisationAuthor(organisation.id) },
      }),
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.author).toEqual({ kind: 'organisation', id: organisation.id })
    }
  })

  it('should fail when contributor is null (not authenticated)', async () => {
    const result = await execute(createStatementUseCase({ ...validParams, contributor: null }))

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('connecté')
    }
  })

  it('should fail with field error when quote is too short', async () => {
    const result = await execute(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 0 },
        content: { ...EMPTY_CONTENT_INPUT, quote: 'Court' },
      }),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.quote).toBeDefined()
    }
  })

  it('should fail on the field a vote lacks, naming the ballot and not the quote', async () => {
    const result = await execute(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 0 },
        content: { ...EMPTY_CONTENT_INPUT, statementType: 'vote', choice: 'pour' },
      }),
    )

    expect(Either.isLeft(result) && typeof result.left !== 'string' && result.left).toEqual({
      votedText: expect.any(String),
    })
  })

  it('should fail with field error when source name is empty', async () => {
    const result = await execute(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 0 },
        sourceName: '',
      }),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.sourceName).toBeDefined()
    }
  })

  it('should fail with field error when fact date is invalid', async () => {
    const result = await execute(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 0 },
        statedAt: 'pas-une-date',
      }),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.statedAt).toBeDefined()
    }
  })

  it('should fail when public figure is not found', async () => {
    const result = await runFormWith(
      fakes({ figures: { ...fakePublicFigureRepo, findById: () => Effect.succeed(null) } }),
    )(createStatementUseCase({ ...validParams, contributor: { id: 'abc', reputation: 0 } }))

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('personnalité')
    }
  })

  it('should fail when position is not found', async () => {
    const result = await runFormWith(
      fakes({ positions: { ...fakePositionRepo, findById: () => Effect.succeed(null) } }),
    )(createStatementUseCase({ ...validParams, contributor: { id: 'abc', reputation: 0 } }))

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('position')
    }
  })

  it('should fail when position does not belong to subject', async () => {
    const wrongPosition = Position.make({
      ...fakePosition,
      subjectId: 'other-subject',
    })

    const result = await runFormWith(
      fakes({
        positions: {
          ...fakePositionRepo,
          findById: () => Effect.succeed(wrongPosition as Position | null),
        },
      }),
    )(createStatementUseCase({ ...validParams, contributor: { id: 'abc', reputation: 0 } }))

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('position')
      expect(result.left).toContain('sujet')
    }
  })

  it('should create statement and award reputation on success', async () => {
    const { run, journal } = inMemoryUnitOfWork()

    const result = await execute(
      createStatementUseCase({ ...validParams, contributor: { id: 'abc', reputation: 0 } }),
      run,
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.author).toEqual({ kind: 'public_figure', id: 'figure-1' })
      expect(result.right.positionId).toBe('pos-1')
      expect(result.right.sourceName).toBe('Le Monde')
      expect(result.right.content).toEqual({
        kind: 'declaration',
        quote: 'Une citation suffisamment longue pour être valide.',
      })
      expect(result.right.createdBy).toBe('abc')
      expect(deedsIn(journal).map((e) => [e.streamType, e.streamId, e.revision, e.type])).toEqual([
        ['statement', result.right.id, 1, 'StatementAdded'],
      ])
    }
    expect(grantsIn(journal)).toEqual([['abc', 'added_statement_validated', 50]])
  })
})
