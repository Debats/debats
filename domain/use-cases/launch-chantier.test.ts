import { describe, expect, it } from 'vitest'
import { Effect, Either } from 'effect'
import { AgentUnavailable } from '../services/chantier-agent'
import { ADMIN, chantierFakes, fakeAgent, inMemoryChantiers } from './chantier-test-helpers'
import { runWith } from './command-test-helpers'
import { launchChantierUseCase } from './launch-chantier'

describe('launchChantierUseCase', () => {
  it('writes the chantier, opens a session on it and keeps the session id', async () => {
    const chantiers = inMemoryChantiers()
    const { agent, calls } = fakeAgent()
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      launchChantierUseCase({
        contributor: ADMIN,
        brief: '  Qui a réagi au blocage des lycées ?  ',
      }),
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.brief).toBe('Qui a réagi au blocage des lycées ?')
      expect(result.right.status).toBe('working')
      expect(result.right.sessionId).toBe(`sesn_for_${result.right.id}`)
      expect(result.right.createdBy).toBe(ADMIN.id)
    }
    expect(calls.opened).toHaveLength(1)
  })

  it('leaves the chantier ended, and says why, when the session cannot be opened', async () => {
    const chantiers = inMemoryChantiers()
    const { agent } = fakeAgent({
      open: Effect.fail(new AgentUnavailable('L’agent ne répond pas pour le moment.')),
    })
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      launchChantierUseCase({ contributor: ADMIN, brief: 'Qui a réagi au blocage des lycées ?' }),
    )

    expect(result).toEqual(Either.left('L’agent ne répond pas pour le moment.'))
    const [written] = Array.from(chantiers.rows.values())
    expect(written.status).toBe('ended')
    expect(written.sessionId).toBeNull()
  })

  it('refuses a brief too short to work from, before writing anything', async () => {
    const chantiers = inMemoryChantiers()
    const { agent, calls } = fakeAgent()
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      launchChantierUseCase({ contributor: ADMIN, brief: 'Zucman' }),
    )

    expect(Either.isLeft(result)).toBe(true)
    expect(chantiers.rows.size).toBe(0)
    expect(calls.opened).toHaveLength(0)
  })

  it('is for admins only', async () => {
    const chantiers = inMemoryChantiers()
    const { agent } = fakeAgent()
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      launchChantierUseCase({
        contributor: { id: 'someone', reputation: 10 },
        brief: 'Qui a réagi au blocage des lycées ?',
      }),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) expect(result.left).toContain('lancer un chantier')
    expect(chantiers.rows.size).toBe(0)
  })
})
