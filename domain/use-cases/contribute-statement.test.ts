import { describe, it, expect } from 'vitest'
import { Either, Effect, Option } from 'effect'
import { addDays, format } from 'date-fns'
import { contributeStatementUseCase } from './contribute-statement'
import { Position, PositionId, PositionTitle } from '../entities/position'
import { Statement, Evidence } from '../entities/statement'
import {
  PublicFigure,
  PublicFigureId,
  PublicFigureName,
  PublicFigureSlug,
} from '../entities/public-figure'
import { Subject, SubjectId, SubjectSlug, SubjectTitle } from '../entities/subject'

const fakeSubject = Subject.make({
  id: SubjectId.make('subject-1'),
  title: SubjectTitle.make('Faut-il interdire les SUV ?'),
  slug: SubjectSlug.make('faut-il-interdire-les-suv'),
  presentation: 'Un sujet de débat sur les SUV en ville.',
  problem: 'Les SUV polluent et prennent de la place.',
  createdAt: new Date(),
  updatedAt: new Date(),
})

const fakePosition = Position.make({
  id: PositionId.make('position-1'),
  title: PositionTitle.make('Pour l\u2019interdiction'),
  description: 'Les SUV devraient être interdits dans les centres-villes.',
  subjectId: 'subject-1',
  createdAt: new Date(),
  updatedAt: new Date(),
})

const fakeFigure = PublicFigure.make({
  id: PublicFigureId.make('figure-1'),
  name: PublicFigureName.make('Jean Dupont'),
  slug: PublicFigureSlug.make('jean-dupont'),
  presentation: 'Un personnage public suffisamment connu.',
  wikipediaUrl: Option.some('https://fr.wikipedia.org/wiki/Jean_Dupont'),
  notorietySources: [],
  websiteUrl: Option.none(),
  createdBy: 'abc',
  createdAt: new Date(),
  updatedAt: new Date(),
})

const fakeStatementRepo = {
  create: (s: Statement) => Effect.succeed(s),
  createEvidence: (e: Evidence) => Effect.succeed(e),
  findById: () => Effect.succeed(null),
  findByPublicFigureId: () => Effect.succeed([]),
  findByPositionId: () => Effect.succeed([]),
  findByPublicFigureWithDetails: () => Effect.succeed([]),
  findBySubjectWithFigures: () => Effect.succeed([]),
  findLatest: () => Effect.succeed([]),
  findLatestReported: () => Effect.succeed([]),
  delete: () => Effect.succeed(undefined as void),
  getEvidences: () => Effect.succeed([]),
}

const fakePositionRepo = {
  findById: () => Effect.succeed(fakePosition as Position | null),
  findBySubjectId: () => Effect.succeed([fakePosition] as Position[]),
  create: (p: Position) => Effect.succeed(p),
}

const fakeSubjectRepo = {
  findAll: () => Effect.succeed([fakeSubject]),
  findBySlug: () => Effect.succeed(fakeSubject as Subject | null),
  findById: () => Effect.succeed(fakeSubject as Subject | null),
  create: (s: Subject) => Effect.succeed(s),
  update: (s: Subject) => Effect.succeed(s),
  delete: () => Effect.succeed(undefined as void),
  getStats: () =>
    Effect.succeed({
      subjectId: '',
      positionsCount: 0,
      statementsCount: 0,
      publicFiguresCount: 0,
    }),
  findSummariesByActivity: () => Effect.succeed([]),
}

const fakePublicFigureRepo = {
  findAll: () => Effect.succeed([]),
  findBySlug: () => Effect.succeed(null as PublicFigure | null),
  findById: () => Effect.succeed(fakeFigure as PublicFigure | null),
  findByWikipediaUrl: () => Effect.succeed(null as PublicFigure | null),
  searchByName: () => Effect.succeed([]),
  create: (f: PublicFigure) => Effect.succeed(f),
  update: (f: PublicFigure) => Effect.succeed(f),
  delete: () => Effect.succeed(undefined as void),
  getStats: () =>
    Effect.succeed({
      publicFigureId: '',
      subjectsCount: 0,
      positionsCount: 0,
      statementsCount: 0,
    }),
}

const fakeReputationRepo = {
  getReputation: () => Effect.succeed(0),
  recordEvent: () => Effect.succeed(undefined as void),
  getHistory: () => Effect.succeed([]),
}

const fakeWikipediaValidator = {
  validatePage: async () => ({ exists: true, isBiography: true }),
}

const validParamsAllExisting = {
  publicFigureId: 'figure-1',
  subjectId: 'subject-1',
  positionId: 'position-1',
  sourceName: 'Le Monde',
  sourceUrl: 'https://lemonde.fr/article',
  quote: 'Une citation suffisamment longue pour être valide.',
  factDate: '2024-01-15',
  statementRepo: fakeStatementRepo,
  positionRepo: fakePositionRepo,
  subjectRepo: fakeSubjectRepo,
  publicFigureRepo: fakePublicFigureRepo,
  reputationRepo: fakeReputationRepo,
  wikipediaValidator: fakeWikipediaValidator,
}

const validParamsAllNew = {
  newPublicFigure: {
    name: 'Jean Dupont',
    presentation: 'Un personnage public suffisamment connu pour apparaître.',
    wikipediaUrl: 'https://fr.wikipedia.org/wiki/Jean_Dupont',
    websiteUrl: '',
  },
  newSubject: {
    title: 'Faut-il interdire les SUV ?',
    presentation: 'Un sujet de débat sur les SUV en ville.',
    problem: 'Les SUV polluent et prennent de la place.',
  },
  newPosition: {
    title: 'Pour l\u2019interdiction',
    description: 'Les SUV devraient être interdits dans les centres-villes.',
  },
  sourceName: 'Le Monde',
  sourceUrl: 'https://lemonde.fr/article',
  quote: 'Une citation suffisamment longue pour être valide.',
  factDate: '2024-01-15',
  statementRepo: fakeStatementRepo,
  positionRepo: fakePositionRepo,
  subjectRepo: fakeSubjectRepo,
  publicFigureRepo: fakePublicFigureRepo,
  reputationRepo: fakeReputationRepo,
  wikipediaValidator: fakeWikipediaValidator,
}

describe('contributeStatementUseCase', () => {
  it('should fail when contributor is null (not authenticated)', async () => {
    const result = await contributeStatementUseCase({
      ...validParamsAllExisting,
      contributor: null,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('connecté')
    }
  })

  it('should fail when creating new personality without add_personality permission', async () => {
    const result = await contributeStatementUseCase({
      ...validParamsAllNew,
      contributor: { id: 'abc', reputation: 0 },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('Éloquent')
    }
  })

  it('should fail when creating new subject without add_subject permission', async () => {
    const result = await contributeStatementUseCase({
      ...validParamsAllExisting,
      newSubject: {
        title: 'Un nouveau sujet de débat',
        presentation: 'Présentation suffisamment longue.',
        problem: 'Problématique suffisamment longue.',
      },
      subjectId: undefined,
      contributor: { id: 'abc', reputation: 0 },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('Éloquent')
    }
  })

  it('should fail with field error when quote is too short', async () => {
    const result = await contributeStatementUseCase({
      ...validParamsAllExisting,
      contributor: { id: 'abc', reputation: 0 },
      quote: 'Court',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.quote).toBeDefined()
    }
  })

  it('should fail with field error when source name is empty', async () => {
    const result = await contributeStatementUseCase({
      ...validParamsAllExisting,
      contributor: { id: 'abc', reputation: 0 },
      sourceName: '',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.sourceName).toBeDefined()
    }
  })

  it('should fail with field error when fact date is invalid', async () => {
    const result = await contributeStatementUseCase({
      ...validParamsAllExisting,
      contributor: { id: 'abc', reputation: 0 },
      factDate: 'pas-une-date',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.factDate).toBeDefined()
    }
  })

  it('should fail with field error when fact date is in the future', async () => {
    const futureDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')

    const result = await contributeStatementUseCase({
      ...validParamsAllExisting,
      contributor: { id: 'abc', reputation: 0 },
      factDate: futureDate,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.factDate).toBeDefined()
      expect(result.left.factDate).toContain('futur')
    }
  })

  it('should accept today as a valid fact date', async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')

    const result = await contributeStatementUseCase({
      ...validParamsAllExisting,
      contributor: { id: 'abc', reputation: 0 },
      factDate: todayStr,
    })

    expect(Either.isRight(result)).toBe(true)
  })

  it('should fail with field error when new subject title is too short', async () => {
    const result = await contributeStatementUseCase({
      ...validParamsAllNew,
      contributor: { id: 'abc', reputation: 1000 },
      newSubject: {
        title: 'Ab',
        presentation: 'Présentation suffisamment longue.',
        problem: 'Problématique suffisamment longue.',
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left['newSubject.title']).toBeDefined()
    }
  })

  it('should fail with field error when new position title is too short', async () => {
    const result = await contributeStatementUseCase({
      ...validParamsAllExisting,
      contributor: { id: 'abc', reputation: 0 },
      positionId: undefined,
      newPosition: {
        title: 'Ab',
        description: 'Description suffisamment longue.',
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left['newPosition.title']).toBeDefined()
    }
  })

  it('should fail with field error when new personality name is too short', async () => {
    const result = await contributeStatementUseCase({
      ...validParamsAllNew,
      contributor: { id: 'abc', reputation: 1000 },
      newPublicFigure: {
        name: 'A',
        presentation: 'Présentation suffisamment longue.',
        wikipediaUrl: 'https://fr.wikipedia.org/wiki/Test',
        websiteUrl: '',
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left['newPublicFigure.name']).toBeDefined()
    }
  })

  it('should fail with field error when new personality Wikipedia URL is invalid', async () => {
    const result = await contributeStatementUseCase({
      ...validParamsAllNew,
      contributor: { id: 'abc', reputation: 1000 },
      newPublicFigure: {
        name: 'Jean Dupont',
        presentation: 'Présentation suffisamment longue.',
        wikipediaUrl: 'https://google.com',
        websiteUrl: '',
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left['newPublicFigure.wikipediaUrl']).toBeDefined()
    }
  })

  it('should fail when new personality Wikipedia URL is already used', async () => {
    const result = await contributeStatementUseCase({
      ...validParamsAllNew,
      contributor: { id: 'abc', reputation: 1000 },
      publicFigureRepo: {
        ...fakePublicFigureRepo,
        findByWikipediaUrl: () => Effect.succeed(fakeFigure),
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left['newPublicFigure.wikipediaUrl']).toBeDefined()
      expect(result.left['newPublicFigure.wikipediaUrl']).toContain('déjà')
    }
  })

  it('should fail when existing public figure ID is not found', async () => {
    const result = await contributeStatementUseCase({
      ...validParamsAllExisting,
      contributor: { id: 'abc', reputation: 0 },
      publicFigureRepo: {
        ...fakePublicFigureRepo,
        findById: () => Effect.succeed(null),
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('personnalité')
    }
  })

  it('should fail when existing subject ID is not found', async () => {
    const result = await contributeStatementUseCase({
      ...validParamsAllExisting,
      contributor: { id: 'abc', reputation: 0 },
      subjectRepo: {
        ...fakeSubjectRepo,
        findById: () => Effect.succeed(null),
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('sujet')
    }
  })

  it('should fail when existing position ID is not found', async () => {
    const result = await contributeStatementUseCase({
      ...validParamsAllExisting,
      contributor: { id: 'abc', reputation: 0 },
      positionRepo: {
        ...fakePositionRepo,
        findById: () => Effect.succeed(null),
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('position')
    }
  })

  it('should fail when existing position does not belong to the subject', async () => {
    const wrongPosition = Position.make({
      ...fakePosition,
      subjectId: 'other-subject',
    })

    const result = await contributeStatementUseCase({
      ...validParamsAllExisting,
      contributor: { id: 'abc', reputation: 0 },
      positionRepo: {
        ...fakePositionRepo,
        findById: () => Effect.succeed(wrongPosition),
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('position')
    }
  })

  it('should fail when Wikipedia page does not exist for new personality', async () => {
    const result = await contributeStatementUseCase({
      ...validParamsAllNew,
      contributor: { id: 'abc', reputation: 1000 },
      wikipediaValidator: {
        validatePage: async () => ({ exists: false, isBiography: false }),
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left['newPublicFigure.wikipediaUrl']).toBeDefined()
      expect(result.left['newPublicFigure.wikipediaUrl']).toContain('existe pas')
    }
  })

  it('should fail when Wikipedia page is not a biography for new personality', async () => {
    const result = await contributeStatementUseCase({
      ...validParamsAllNew,
      contributor: { id: 'abc', reputation: 1000 },
      wikipediaValidator: {
        validatePage: async () => ({ exists: true, isBiography: false }),
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left['newPublicFigure.wikipediaUrl']).toBeDefined()
      expect(result.left['newPublicFigure.wikipediaUrl']).toContain('biographi')
    }
  })

  it('should create statement + evidence with 50 pts when all entities exist', async () => {
    let totalReputationAdded = 0
    let createdStatement: Statement | null = null
    let createdEvidence: Evidence | null = null

    const result = await contributeStatementUseCase({
      ...validParamsAllExisting,
      contributor: { id: 'abc', reputation: 0 },
      statementRepo: {
        ...fakeStatementRepo,
        create: (s: Statement) => {
          createdStatement = s
          return Effect.succeed(s)
        },
        createEvidence: (e: Evidence) => {
          createdEvidence = e
          return Effect.succeed(e)
        },
      },
      reputationRepo: {
        getReputation: () => Effect.succeed(0),
        recordEvent: (event) => {
          totalReputationAdded += event.amount
          return Effect.succeed(undefined as void)
        },
        getHistory: () => Effect.succeed([]),
      },
    })

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.subjectSlug).toBe('faut-il-interdire-les-suv')
    }

    expect(createdStatement).not.toBeNull()
    expect(createdStatement!.publicFigureId).toBe('figure-1')
    expect(createdStatement!.positionId).toBe('position-1')
    expect(createdEvidence).not.toBeNull()
    expect(createdEvidence!.statementId).toBe(createdStatement!.id)
    expect(createdEvidence!.sourceName).toBe('Le Monde')
    expect(totalReputationAdded).toBe(50) // only statement reward
  })

  it('should create everything with 200 pts when all entities are new', async () => {
    let totalReputationAdded = 0
    let createdFigure: PublicFigure | null = null
    let createdSubject: Subject | null = null
    let createdPosition: Position | null = null
    let createdStatement: Statement | null = null
    let createdEvidence: Evidence | null = null

    const result = await contributeStatementUseCase({
      ...validParamsAllNew,
      contributor: { id: 'abc', reputation: 1000 },
      publicFigureRepo: {
        ...fakePublicFigureRepo,
        create: (f: PublicFigure) => {
          createdFigure = f
          return Effect.succeed(f)
        },
      },
      subjectRepo: {
        ...fakeSubjectRepo,
        create: (s: Subject) => {
          createdSubject = s
          return Effect.succeed(s)
        },
      },
      positionRepo: {
        ...fakePositionRepo,
        create: (p: Position) => {
          createdPosition = p
          return Effect.succeed(p)
        },
      },
      statementRepo: {
        ...fakeStatementRepo,
        create: (s: Statement) => {
          createdStatement = s
          return Effect.succeed(s)
        },
        createEvidence: (e: Evidence) => {
          createdEvidence = e
          return Effect.succeed(e)
        },
      },
      reputationRepo: {
        getReputation: () => Effect.succeed(1000),
        recordEvent: (event) => {
          totalReputationAdded += event.amount
          return Effect.succeed(undefined as void)
        },
        getHistory: () => Effect.succeed([]),
      },
    })

    expect(Either.isRight(result)).toBe(true)

    expect(createdFigure).not.toBeNull()
    expect(createdFigure!.name).toBe('Jean Dupont')
    expect(createdFigure!.createdBy).toBe('abc')

    expect(createdSubject).not.toBeNull()
    expect(createdSubject!.title).toBe('Faut-il interdire les SUV ?')

    expect(createdPosition).not.toBeNull()
    expect(createdPosition!.subjectId).toBe(createdSubject!.id)

    expect(createdStatement).not.toBeNull()
    expect(createdStatement!.publicFigureId).toBe(createdFigure!.id)
    expect(createdStatement!.positionId).toBe(createdPosition!.id)

    expect(createdEvidence).not.toBeNull()
    expect(createdEvidence!.statementId).toBe(createdStatement!.id)

    // 50 (personality) + 50 (subject) + 50 (position) + 50 (statement) = 200
    expect(totalReputationAdded).toBe(200)
  })
})
