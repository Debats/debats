import { describe, it, expect, vi } from 'vitest'
import { Effect, Either } from 'effect'
import { validateDraft } from './validate-draft'
import { DraftStatement } from '../entities/draft-statement'
import { DraftStatementRepository } from '../repositories/draft-statement-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { SubjectRepository } from '../repositories/subject-repository'
import { PositionRepository } from '../repositories/position-repository'
import { StatementRepository } from '../repositories/statement-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { PublicFigure } from '../entities/public-figure'
import { Subject } from '../entities/subject'
import { Position } from '../entities/position'
import { ContributorIdentity } from './types'
import { makeDraft, makePublicFigure, makeSubject, makePosition } from './draft-test-helpers'

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
  subject?: Subject | null
  positions?: Position[]
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

  const statementRepo = {
    create: vi.fn((s: unknown) => Effect.succeed(s)),
  } as unknown as StatementRepository & {
    create: ReturnType<typeof vi.fn>
  }

  const reputationRepo = {
    recordEvent: vi.fn(() => Effect.succeed(undefined)),
  } as unknown as ReputationRepository & {
    recordEvent: ReturnType<typeof vi.fn>
  }

  return { draftRepo, publicFigureRepo, subjectRepo, positionRepo, statementRepo, reputationRepo }
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
    expect(repos.statementRepo.create).toHaveBeenCalledOnce()
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
    expect(repos.statementRepo.create).toHaveBeenCalledOnce()
    expect(repos.draftRepo.updateStatus).toHaveBeenCalledWith('draft-1', 'validated')
  })

  it('should fail when entity is missing and no creation data', async () => {
    const repos = makeRepos({
      draft: makeDraft({ publicFigureData: null }),
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
})
