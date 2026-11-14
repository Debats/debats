import { describe, expect, it } from 'vitest'
import { Effect, Either } from 'effect'
import { BUDGET_REACHED, BudgetReached } from '../services/chantier-agent'
import { CHANTIER_CLOSED, NO_SESSION } from './chantier-preconditions'
import {
  aChantier,
  ADMIN,
  chantierFakes,
  fakeAgent,
  inMemoryChantiers,
} from './chantier-test-helpers'
import { runWith } from './command-test-helpers'
import { deliverChantierReviewsUseCase, NOTHING_TO_DELIVER } from './deliver-chantier-reviews'

const deliver = (chantierId = 'chantier-1', contributor: typeof ADMIN | null = ADMIN) =>
  deliverChantierReviewsUseCase({ contributor, chantierId })

const keep = (chantiers: ReturnType<typeof inMemoryChantiers>, chantierId: string, text: string) =>
  Effect.runPromise(chantiers.repository.keepUnheard(chantierId, text))

describe('deliverChantierReviewsUseCase', () => {
  it('tells the agent every review kept for it in one message, the oldest first, and sets it to work', async () => {
    const chantiers = inMemoryChantiers([aChantier({ status: 'waiting' })])
    await keep(chantiers, 'chantier-1', 'Relecture : une.')
    await keep(chantiers, 'chantier-1', 'Relecture : deux.')
    await keep(chantiers, 'chantier-2', 'Relecture : ailleurs.')
    const { agent, calls } = fakeAgent()
    const result = await runWith(chantierFakes(chantiers.repository, agent))(deliver())

    expect(calls.told).toEqual([
      { sessionId: 'sesn_1', text: 'Relecture : une.\n\nRelecture : deux.' },
    ])
    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.chantier.status).toBe('working')
      expect(result.right.messages.map(({ role, text }) => ({ role, text }))).toEqual([
        { role: 'review', text: 'Relecture : une.' },
        { role: 'review', text: 'Relecture : deux.' },
      ])
    }
    expect(chantiers.unheard.map(({ text }) => text)).toEqual(['Relecture : ailleurs.'])
  })

  it('refuses when no review is waiting: the agent is not woken for nothing', async () => {
    const chantiers = inMemoryChantiers([aChantier({ status: 'waiting' })])
    const { agent, calls } = fakeAgent()
    const result = await runWith(chantierFakes(chantiers.repository, agent))(deliver())

    expect(result).toEqual(Either.left(NOTHING_TO_DELIVER))
    expect(calls.told).toHaveLength(0)
    expect(chantiers.rows.get('chantier-1')?.status).toBe('waiting')
  })

  it('says so when the agent is stopped at its budget, and keeps the reviews for later', async () => {
    const chantiers = inMemoryChantiers([aChantier({ status: 'blocked' })])
    await keep(chantiers, 'chantier-1', 'Relecture : une.')
    const { agent } = fakeAgent({ tell: Effect.fail(new BudgetReached()) })
    const result = await runWith(chantierFakes(chantiers.repository, agent))(deliver())

    expect(result).toEqual(Either.left(BUDGET_REACHED))
    expect(chantiers.messages).toHaveLength(0)
    expect(chantiers.unheard).toHaveLength(1)
    expect(chantiers.rows.get('chantier-1')?.status).toBe('blocked')
  })

  it('refuses a closed chantier, and one whose agent was never launched', async () => {
    const closed = inMemoryChantiers([aChantier({ status: 'closed' })])
    const pending = inMemoryChantiers([aChantier({ status: 'pending', sessionId: null })])
    await keep(pending, 'chantier-1', 'Relecture : une.')
    const { agent, calls } = fakeAgent()

    expect(await runWith(chantierFakes(closed.repository, agent))(deliver())).toEqual(
      Either.left(CHANTIER_CLOSED),
    )
    expect(await runWith(chantierFakes(pending.repository, agent))(deliver())).toEqual(
      Either.left(NO_SESSION),
    )
    expect(calls.told).toHaveLength(0)
    expect(pending.unheard).toHaveLength(1)
  })

  it('refuses who is not an admin', async () => {
    const chantiers = inMemoryChantiers([aChantier()])
    await keep(chantiers, 'chantier-1', 'Relecture : une.')
    const { agent, calls } = fakeAgent()
    const fakes = chantierFakes(chantiers.repository, agent)

    expect(Either.isLeft(await runWith(fakes)(deliver('chantier-1', null)))).toBe(true)
    expect(
      Either.isLeft(await runWith(fakes)(deliver('chantier-1', { id: 'someone', reputation: 10 }))),
    ).toBe(true)
    expect(calls.told).toHaveLength(0)
  })
})
