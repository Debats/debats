import { describe, expect, it } from 'vitest'
import { Effect, Either, Layer } from 'effect'
import { DraftStatementRepository } from '../repositories/draft-statement-repository'
import { AgentUnavailable } from '../services/chantier-agent'
import {
  aChantier,
  ADMIN,
  chantierFakes,
  fakeAgent,
  inMemoryChantiers,
} from './chantier-test-helpers'
import { runWith } from './command-test-helpers'
import { makeDraft } from './draft-test-helpers'
import { ALREADY_STARTED, startChantierUseCase } from './start-chantier'

const holding = (count: number) =>
  Layer.succeed(DraftStatementRepository, {
    findByChantier: () =>
      Effect.succeed(Array.from({ length: count }, (_, i) => makeDraft({ id: `d${i}` }))),
  } as unknown as DraftStatementRepository)

const adopted = aChantier({ status: 'pending', sessionId: null, title: 'Énergie et climat' })

describe('startChantierUseCase', () => {
  it('opens a session told of the drafts already there, and sets the chantier working', async () => {
    const chantiers = inMemoryChantiers([adopted])
    const { agent, calls } = fakeAgent()
    const result = await runWith(
      Layer.merge(chantierFakes(chantiers.repository, agent), holding(54)),
    )(startChantierUseCase({ contributor: ADMIN, chantierId: 'chantier-1' }))

    expect(Either.isRight(result)).toBe(true)
    expect(calls.opened).toEqual([
      {
        id: 'chantier-1',
        brief: adopted.brief,
        title: 'Énergie et climat',
        existingDrafts: 54,
        recap: null,
      },
    ])
    expect(chantiers.rows.get('chantier-1')).toMatchObject({
      status: 'working',
      sessionId: 'sesn_for_chantier-1',
    })
  })

  it('hands the agent what the thread already says in its name: the recap of the pass before', async () => {
    const chantiers = inMemoryChantiers([adopted])
    chantiers.messages.push(
      {
        id: 'm1',
        chantierId: 'chantier-1',
        role: 'agent',
        text: 'Vingt-six sujets traités.',
        eventId: null,
        createdAt: new Date(),
      },
      {
        id: 'm2',
        chantierId: 'chantier-1',
        role: 'agent',
        text: 'Six brouillons gardés en réserve.',
        eventId: null,
        createdAt: new Date(),
      },
    )
    const { agent, calls } = fakeAgent()
    const result = await runWith(
      Layer.merge(chantierFakes(chantiers.repository, agent), holding(3)),
    )(startChantierUseCase({ contributor: ADMIN, chantierId: 'chantier-1' }))

    expect(Either.isRight(result)).toBe(true)
    expect(calls.opened[0].recap).toBe(
      'Vingt-six sujets traités.\n\nSix brouillons gardés en réserve.',
    )
  })

  it('leaves the chantier pending, and says why, when the session cannot be opened', async () => {
    const chantiers = inMemoryChantiers([adopted])
    const { agent } = fakeAgent({ open: Effect.fail(new AgentUnavailable('Injoignable')) })
    const result = await runWith(
      Layer.merge(chantierFakes(chantiers.repository, agent), holding(1)),
    )(startChantierUseCase({ contributor: ADMIN, chantierId: 'chantier-1' }))

    expect(result).toEqual(Either.left('Injoignable'))
    expect(chantiers.rows.get('chantier-1')).toMatchObject({ status: 'pending', sessionId: null })
  })

  it('refuses a chantier whose agent already runs', async () => {
    const chantiers = inMemoryChantiers([aChantier({ status: 'working' })])
    const { agent, calls } = fakeAgent()
    const result = await runWith(
      Layer.merge(chantierFakes(chantiers.repository, agent), holding(1)),
    )(startChantierUseCase({ contributor: ADMIN, chantierId: 'chantier-1' }))

    expect(result).toEqual(Either.left(ALREADY_STARTED))
    expect(calls.opened).toHaveLength(0)
  })
})
