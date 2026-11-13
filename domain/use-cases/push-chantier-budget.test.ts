import { describe, expect, it } from 'vitest'
import { Effect, Either } from 'effect'
import { AgentUnavailable } from '../services/chantier-agent'
import { BUDGET_STEP_CENTS } from '../services/chantier-budget'
import { CHANTIER_CLOSED, NO_SESSION } from './chantier-preconditions'
import {
  aChantier,
  ADMIN,
  chantierFakes,
  fakeAgent,
  inMemoryChantiers,
} from './chantier-test-helpers'
import { runWith } from './command-test-helpers'
import { pushChantierBudgetUseCase } from './push-chantier-budget'

const push = (chantierId = 'chantier-1', contributor: typeof ADMIN | null = ADMIN) =>
  pushChantierBudgetUseCase({ contributor, chantierId })

describe('pushChantierBudgetUseCase', () => {
  it('pushes the cap of the session one step further and says where the budget now stands', async () => {
    const chantiers = inMemoryChantiers([aChantier({ status: 'waiting' })])
    const pushed = { spentCents: 1200, capCents: 3000, reached: false }
    const { agent, calls } = fakeAgent({ push: Effect.succeed(pushed) })
    const result = await runWith(chantierFakes(chantiers.repository, agent))(push())

    expect(calls.pushed).toEqual([{ sessionId: 'sesn_1', stepCents: BUDGET_STEP_CENTS }])
    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.budget).toEqual(pushed)
      expect(result.right.chantier.status).toBe('waiting')
    }
  })

  it('sets a blocked chantier back to work: the session resumes by itself once it has room', async () => {
    const chantiers = inMemoryChantiers([aChantier({ status: 'blocked' })])
    const { agent } = fakeAgent()
    const result = await runWith(chantierFakes(chantiers.repository, agent))(push())

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) expect(result.right.chantier.status).toBe('working')
    expect(chantiers.rows.get('chantier-1')?.status).toBe('working')
  })

  it('leaves the chantier as it was when the session refuses', async () => {
    const chantiers = inMemoryChantiers([aChantier({ status: 'blocked' })])
    const { agent } = fakeAgent({ push: Effect.fail(new AgentUnavailable('Pas maintenant.')) })
    const result = await runWith(chantierFakes(chantiers.repository, agent))(push())

    expect(result).toEqual(Either.left('Pas maintenant.'))
    expect(chantiers.rows.get('chantier-1')?.status).toBe('blocked')
  })

  it('refuses a closed chantier', async () => {
    const chantiers = inMemoryChantiers([aChantier({ status: 'closed' })])
    const { agent, calls } = fakeAgent()
    const result = await runWith(chantierFakes(chantiers.repository, agent))(push())

    expect(result).toEqual(Either.left(CHANTIER_CLOSED))
    expect(calls.pushed).toHaveLength(0)
  })

  it('refuses a chantier whose session was never opened', async () => {
    const chantiers = inMemoryChantiers([aChantier({ sessionId: null })])
    const { agent } = fakeAgent()
    const result = await runWith(chantierFakes(chantiers.repository, agent))(push())

    expect(result).toEqual(Either.left(NO_SESSION))
  })

  it('refuses who is not an admin', async () => {
    const chantiers = inMemoryChantiers([aChantier()])
    const { agent, calls } = fakeAgent()
    const fakes = chantierFakes(chantiers.repository, agent)

    expect(Either.isLeft(await runWith(fakes)(push('chantier-1', null)))).toBe(true)
    expect(
      Either.isLeft(await runWith(fakes)(push('chantier-1', { id: 'someone', reputation: 10 }))),
    ).toBe(true)
    expect(calls.pushed).toHaveLength(0)
  })
})
