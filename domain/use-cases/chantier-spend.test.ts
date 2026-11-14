import { describe, expect, it } from 'vitest'
import { Effect } from 'effect'
import { Chantier } from '../entities/chantier'
import { AgentUnavailable } from '../services/chantier-agent'
import { chantierSpend } from './chantier-spend'
import { aChantier, chantierFakes, fakeAgent, inMemoryChantiers } from './chantier-test-helpers'

const SPENT = { spentCents: 412, capCents: 2000 }
const atRest = Effect.succeed({ spend: SPENT, settled: true })

const read = (chantier: Chantier, behaviour: Parameters<typeof fakeAgent>[0] = {}) => {
  const { repository, rows } = inMemoryChantiers([chantier])
  const { agent, calls } = fakeAgent(behaviour)
  return Effect.runPromise(
    Effect.provide(chantierSpend(chantier), chantierFakes(repository, agent)),
  ).then((spend) => ({ spend, calls, kept: rows.get(chantier.id)?.spend ?? null }))
}

describe('chantierSpend', () => {
  it('asks the session of a chantier still open, and keeps nothing: the figures still move', async () => {
    const { spend, kept } = await read(aChantier({ status: 'waiting' }), { spend: atRest })

    expect(spend).toEqual(SPENT)
    expect(kept).toBeNull()
  })

  it('reads what a closed chantier kept, without asking its session', async () => {
    const { spend, calls } = await read(aChantier({ status: 'closed', spend: SPENT }), {
      spend: Effect.succeed({ spend: { spentCents: 999, capCents: 2000 }, settled: true }),
    })

    expect(spend).toEqual(SPENT)
    expect(calls.spendAsked).toEqual([])
  })

  it('asks the session of a closed chantier that kept nothing yet, once, and keeps the answer', async () => {
    const { spend, calls, kept } = await read(aChantier({ status: 'closed' }), { spend: atRest })

    expect(spend).toEqual(SPENT)
    expect(calls.spendAsked).toEqual(['sesn_1'])
    expect(kept).toEqual(SPENT)
  })

  it('shows what a closed chantier spent so far while its session still runs, and keeps nothing: the request it was stopped on is not counted yet', async () => {
    const { spend, kept } = await read(aChantier({ status: 'closed' }), {
      spend: Effect.succeed({ spend: SPENT, settled: false }),
    })

    expect(spend).toEqual(SPENT)
    expect(kept).toBeNull()
  })

  it('keeps nothing for a closed chantier whose session runs without a cap', async () => {
    const { spend, kept } = await read(aChantier({ status: 'closed' }), {
      spend: Effect.succeed({ spend: null, settled: true }),
    })

    expect(spend).toBeNull()
    expect(kept).toBeNull()
  })

  it('knows nothing of a chantier without a session', async () => {
    const { spend, calls } = await read(aChantier({ status: 'pending', sessionId: null }))

    expect(spend).toBeNull()
    expect(calls.spendAsked).toEqual([])
  })

  it('knows nothing when the session does not answer, and keeps nothing: it will be asked again', async () => {
    const { spend, kept } = await read(aChantier({ status: 'closed' }), {
      spend: Effect.fail(new AgentUnavailable('L’agent ne répond pas')),
    })

    expect(spend).toBeNull()
    expect(kept).toBeNull()
  })
})
