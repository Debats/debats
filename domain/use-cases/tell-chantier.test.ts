import { describe, expect, it } from 'vitest'
import { Effect, Either } from 'effect'
import { AgentUnavailable, BUDGET_REACHED, BudgetReached } from '../services/chantier-agent'
import { CHANTIER_CLOSED, NO_SESSION } from './chantier-preconditions'
import {
  aChantier,
  ADMIN,
  chantierFakes,
  fakeAgent,
  inMemoryChantiers,
} from './chantier-test-helpers'
import { runWith } from './command-test-helpers'
import { tellChantierUseCase } from './tell-chantier'

describe('tellChantierUseCase', () => {
  it('sends the message to the session, mirrors it and sets the agent to work', async () => {
    const chantiers = inMemoryChantiers([aChantier({ status: 'waiting' })])
    const { agent, calls } = fakeAgent()
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      tellChantierUseCase({
        contributor: ADMIN,
        chantierId: 'chantier-1',
        text: ' Cherche des femmes ',
      }),
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.chantier.status).toBe('working')
      expect(result.right.messages.map(({ role, text }) => ({ role, text }))).toEqual([
        { role: 'person', text: 'Cherche des femmes' },
      ])
    }
    expect(calls.told).toEqual([{ sessionId: 'sesn_1', text: 'Cherche des femmes' }])
  })

  it('mirrors nothing when the session refuses the message', async () => {
    const chantiers = inMemoryChantiers([aChantier()])
    const { agent } = fakeAgent({
      tell: Effect.fail(new AgentUnavailable('L’agent attend une décision dans la console.')),
    })
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      tellChantierUseCase({ contributor: ADMIN, chantierId: 'chantier-1', text: 'Continue' }),
    )

    expect(result).toEqual(Either.left('L’agent attend une décision dans la console.'))
    expect(chantiers.messages).toHaveLength(0)
  })

  it('says the budget is reached when that is why the session refuses the message', async () => {
    const chantiers = inMemoryChantiers([aChantier({ status: 'blocked' })])
    const { agent } = fakeAgent({ tell: Effect.fail(new BudgetReached()) })
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      tellChantierUseCase({ contributor: ADMIN, chantierId: 'chantier-1', text: 'Continue' }),
    )

    expect(result).toEqual(Either.left(BUDGET_REACHED))
    expect(chantiers.messages).toHaveLength(0)
    expect(chantiers.rows.get('chantier-1')?.status).toBe('blocked')
  })

  it('refuses a closed chantier', async () => {
    const chantiers = inMemoryChantiers([aChantier({ status: 'closed' })])
    const { agent, calls } = fakeAgent()
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      tellChantierUseCase({ contributor: ADMIN, chantierId: 'chantier-1', text: 'Continue' }),
    )

    expect(result).toEqual(Either.left(CHANTIER_CLOSED))
    expect(calls.told).toHaveLength(0)
  })

  it('refuses a chantier whose session was never opened', async () => {
    const chantiers = inMemoryChantiers([aChantier({ sessionId: null })])
    const { agent } = fakeAgent()
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      tellChantierUseCase({ contributor: ADMIN, chantierId: 'chantier-1', text: 'Continue' }),
    )

    expect(result).toEqual(Either.left(NO_SESSION))
  })

  it('refuses an empty message', async () => {
    const chantiers = inMemoryChantiers([aChantier()])
    const { agent, calls } = fakeAgent()
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      tellChantierUseCase({ contributor: ADMIN, chantierId: 'chantier-1', text: '   ' }),
    )

    expect(Either.isLeft(result)).toBe(true)
    expect(calls.told).toHaveLength(0)
  })
})
