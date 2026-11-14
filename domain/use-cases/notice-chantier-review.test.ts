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
  it('keeps what the review did for the agent of the chantier, without waking it', async () => {
    const chantiers = inMemoryChantiers([aChantier({ status: 'waiting' })])
    const { agent, calls } = fakeAgent()
    const result = await runWith(
      Layer.merge(
        chantierFakes(chantiers.repository, agent),
        draftsHolding(validated('chantier-1')),
      ),
    )(noticeChantierReviewUseCase({ contributor: ADMIN, draftId: 'draft-1' }))

    expect(result).toEqual(Either.right({ kept: true }))
    expect(calls.told).toHaveLength(0)
    expect(chantiers.unheard.map(({ chantierId }) => chantierId)).toEqual(['chantier-1'])
    expect(chantiers.unheard[0].text).toContain('validé')
    expect(chantiers.messages).toHaveLength(0)
    expect(chantiers.rows.get('chantier-1')?.status).toBe('waiting')
  })

  it('keeps only the last review of a draft reviewed again: what was asked before no longer holds', async () => {
    const chantiers = inMemoryChantiers([aChantier({ status: 'waiting' })])
    const { agent } = fakeAgent()
    const reviewed = (draft: DraftStatement) =>
      runWith(Layer.merge(chantierFakes(chantiers.repository, agent), draftsHolding(draft)))(
        noticeChantierReviewUseCase({ contributor: ADMIN, draftId: draft.id }),
      )

    await reviewed(
      makeDraft({
        id: 'draft-1',
        chantierId: 'chantier-1',
        status: 'revision_requested',
        rejectionNote: 'La citation est tronquée.',
      }),
    )
    await reviewed(makeDraft({ id: 'draft-2', chantierId: 'chantier-1', status: 'rejected' }))
    await reviewed({ ...validated('chantier-1'), id: 'draft-1' })

    expect(chantiers.unheard).toHaveLength(2)
    expect(chantiers.unheard[0].text).toContain('draft-2')
    expect(chantiers.unheard[1].text).toContain('draft-1')
    expect(chantiers.unheard[1].text).toContain('validé')
  })

  it('keeps it all the same for an agent stopped at its budget', async () => {
    const chantiers = inMemoryChantiers([aChantier({ status: 'blocked' })])
    const { agent } = fakeAgent()
    const result = await runWith(
      Layer.merge(
        chantierFakes(chantiers.repository, agent),
        draftsHolding(validated('chantier-1')),
      ),
    )(noticeChantierReviewUseCase({ contributor: ADMIN, draftId: 'draft-1' }))

    expect(result).toEqual(Either.right({ kept: true }))
    expect(chantiers.unheard).toHaveLength(1)
  })

  it('keeps nothing for an agent not launched yet: it will read the drafts as they stand', async () => {
    const chantiers = inMemoryChantiers([aChantier({ status: 'pending', sessionId: null })])
    const { agent } = fakeAgent()
    const result = await runWith(
      Layer.merge(
        chantierFakes(chantiers.repository, agent),
        draftsHolding(validated('chantier-1')),
      ),
    )(noticeChantierReviewUseCase({ contributor: ADMIN, draftId: 'draft-1' }))

    expect(result).toEqual(Either.right({ kept: false }))
    expect(chantiers.unheard).toHaveLength(0)
  })

  it('has nothing to keep for a draft outside any chantier', async () => {
    const chantiers = inMemoryChantiers([aChantier()])
    const { agent } = fakeAgent()
    const result = await runWith(
      Layer.merge(chantierFakes(chantiers.repository, agent), draftsHolding(validated(null))),
    )(noticeChantierReviewUseCase({ contributor: ADMIN, draftId: 'draft-1' }))

    expect(result).toEqual(Either.right({ kept: false }))
    expect(chantiers.unheard).toHaveLength(0)
  })

  it('keeps nothing for a closed chantier: its agent will never be told', async () => {
    const chantiers = inMemoryChantiers([aChantier({ status: 'closed' })])
    const { agent } = fakeAgent()
    const result = await runWith(
      Layer.merge(
        chantierFakes(chantiers.repository, agent),
        draftsHolding(validated('chantier-1')),
      ),
    )(noticeChantierReviewUseCase({ contributor: ADMIN, draftId: 'draft-1' }))

    expect(result).toEqual(Either.right({ kept: false }))
    expect(chantiers.unheard).toHaveLength(0)
  })

  it('says nothing of a draft still pending', async () => {
    const chantiers = inMemoryChantiers([aChantier()])
    const { agent } = fakeAgent()
    const result = await runWith(
      Layer.merge(
        chantierFakes(chantiers.repository, agent),
        draftsHolding(makeDraft({ chantierId: 'chantier-1' })),
      ),
    )(noticeChantierReviewUseCase({ contributor: ADMIN, draftId: 'draft-1' }))

    expect(result).toEqual(Either.right({ kept: false }))
    expect(chantiers.unheard).toHaveLength(0)
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
