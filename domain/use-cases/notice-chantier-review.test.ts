import { describe, expect, it } from 'vitest'
import { Effect, Either, Layer } from 'effect'
import { DraftStatement } from '../entities/draft-statement'
import { DraftStatementRepository } from '../repositories/draft-statement-repository'
import {
  aChantier,
  ADMIN,
  chantierFakes,
  fakeAgent,
  inMemoryChantiers,
} from './chantier-test-helpers'
import { runWith } from './command-test-helpers'
import { makeDraft } from './draft-test-helpers'
import { noticeChantierReviewUseCase } from './notice-chantier-review'

const draftsHolding = (draft: DraftStatement | null) =>
  Layer.succeed(DraftStatementRepository, {
    findById: () => Effect.succeed(draft),
  } as unknown as DraftStatementRepository)

const validated = (chantierId: string | null) =>
  makeDraft({
    chantierId,
    status: 'validated',
    validation: { statementId: 'stmt-1', created: ['subject'] },
  })

describe('noticeChantierReviewUseCase', () => {
  it('tells the agent of the chantier what the review did, and keeps it in the thread', async () => {
    const chantiers = inMemoryChantiers([aChantier({ status: 'waiting' })])
    const { agent, calls } = fakeAgent()
    const result = await runWith(
      Layer.merge(
        chantierFakes(chantiers.repository, agent),
        draftsHolding(validated('chantier-1')),
      ),
    )(noticeChantierReviewUseCase({ contributor: ADMIN, draftId: 'draft-1' }))

    expect(result).toEqual(Either.right({ told: true }))
    expect(calls.told).toHaveLength(1)
    expect(calls.told[0].text).toContain('validé')
    expect(chantiers.messages.map(({ role }) => role)).toEqual(['review'])
    expect(chantiers.rows.get('chantier-1')?.status).toBe('working')
  })

  it('has no one to tell for a draft outside any chantier', async () => {
    const chantiers = inMemoryChantiers([aChantier()])
    const { agent, calls } = fakeAgent()
    const result = await runWith(
      Layer.merge(chantierFakes(chantiers.repository, agent), draftsHolding(validated(null))),
    )(noticeChantierReviewUseCase({ contributor: ADMIN, draftId: 'draft-1' }))

    expect(result).toEqual(Either.right({ told: false }))
    expect(calls.told).toHaveLength(0)
  })

  it('does not wake a closed chantier', async () => {
    const chantiers = inMemoryChantiers([aChantier({ status: 'closed' })])
    const { agent, calls } = fakeAgent()
    const result = await runWith(
      Layer.merge(
        chantierFakes(chantiers.repository, agent),
        draftsHolding(validated('chantier-1')),
      ),
    )(noticeChantierReviewUseCase({ contributor: ADMIN, draftId: 'draft-1' }))

    expect(result).toEqual(Either.right({ told: false }))
    expect(calls.told).toHaveLength(0)
    expect(chantiers.messages).toHaveLength(0)
  })

  it('says nothing of a draft still pending', async () => {
    const chantiers = inMemoryChantiers([aChantier()])
    const { agent, calls } = fakeAgent()
    const result = await runWith(
      Layer.merge(
        chantierFakes(chantiers.repository, agent),
        draftsHolding(makeDraft({ chantierId: 'chantier-1' })),
      ),
    )(noticeChantierReviewUseCase({ contributor: ADMIN, draftId: 'draft-1' }))

    expect(result).toEqual(Either.right({ told: false }))
    expect(calls.told).toHaveLength(0)
  })

  it('refuses a draft it does not know', async () => {
    const chantiers = inMemoryChantiers()
    const { agent } = fakeAgent()
    const result = await runWith(
      Layer.merge(chantierFakes(chantiers.repository, agent), draftsHolding(null)),
    )(noticeChantierReviewUseCase({ contributor: ADMIN, draftId: 'nope' }))

    expect(result).toEqual(Either.left('Brouillon introuvable.'))
  })
})
