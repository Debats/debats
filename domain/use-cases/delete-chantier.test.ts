import { describe, expect, it } from 'vitest'
import { Effect, Either } from 'effect'
import { AgentUnavailable } from '../services/chantier-agent'
import {
  aChantier,
  ADMIN,
  chantierFakes,
  fakeAgent,
  inMemoryChantiers,
} from './chantier-test-helpers'
import { runWith } from './command-test-helpers'
import { deleteChantierUseCase } from './delete-chantier'

describe('deleteChantierUseCase', () => {
  it('forgets the session, then removes the chantier with its conversation', async () => {
    const chantiers = inMemoryChantiers([aChantier()])
    await Effect.runPromise(
      chantiers.repository.addMessages('chantier-1', [
        { role: 'person', text: 'go', eventId: null },
      ]),
    )
    const { agent, calls } = fakeAgent()
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      deleteChantierUseCase({ contributor: ADMIN, chantierId: 'chantier-1' }),
    )

    expect(Either.isRight(result)).toBe(true)
    expect(calls.forgotten).toEqual(['sesn_1'])
    expect(chantiers.rows.has('chantier-1')).toBe(false)
    expect(chantiers.messages).toHaveLength(0)
  })

  it('removes a chantier that never got a session without asking the agent', async () => {
    const chantiers = inMemoryChantiers([aChantier({ sessionId: null, status: 'ended' })])
    const { agent, calls } = fakeAgent()
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      deleteChantierUseCase({ contributor: ADMIN, chantierId: 'chantier-1' }),
    )

    expect(Either.isRight(result)).toBe(true)
    expect(calls.forgotten).toEqual([])
    expect(chantiers.rows.has('chantier-1')).toBe(false)
  })

  it('keeps the chantier when the session cannot be forgotten, and says why', async () => {
    const chantiers = inMemoryChantiers([aChantier()])
    const { agent } = fakeAgent({ forget: Effect.fail(new AgentUnavailable('Injoignable')) })
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      deleteChantierUseCase({ contributor: ADMIN, chantierId: 'chantier-1' }),
    )

    expect(result).toEqual(Either.left('Injoignable'))
    expect(chantiers.rows.has('chantier-1')).toBe(true)
  })

  it('refuses a chantier that does not exist', async () => {
    const chantiers = inMemoryChantiers()
    const { agent } = fakeAgent()
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      deleteChantierUseCase({ contributor: ADMIN, chantierId: 'nope' }),
    )

    expect(result).toEqual(Either.left('Ce chantier n’existe pas.'))
  })

  it('is for admins only', async () => {
    const chantiers = inMemoryChantiers([aChantier()])
    const { agent } = fakeAgent()
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      deleteChantierUseCase({
        contributor: { id: 'someone', reputation: 10 },
        chantierId: 'chantier-1',
      }),
    )

    expect(Either.isLeft(result)).toBe(true)
    expect(chantiers.rows.has('chantier-1')).toBe(true)
  })
})
