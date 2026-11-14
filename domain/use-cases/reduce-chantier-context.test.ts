import { describe, expect, it } from 'vitest'
import { Effect, Either, Layer } from 'effect'
import { DraftStatementRepository } from '../repositories/draft-statement-repository'
import { DatabaseError } from '../repositories/errors'
import { AgentUnavailable } from '../services/chantier-agent'
import { CHANTIER_CLOSED, NO_SESSION } from './chantier-preconditions'
import {
  aChantier,
  ADMIN,
  chantierFakes,
  fakeAgent,
  inMemoryChantiers,
} from './chantier-test-helpers'
import { runWith } from './command-test-helpers'
import { makeDraft } from './draft-test-helpers'
import { AGENT_AT_WORK, reduceChantierContextUseCase } from './reduce-chantier-context'

const holding = (count: number) =>
  Layer.succeed(DraftStatementRepository, {
    findByChantier: () =>
      Effect.succeed(Array.from({ length: count }, (_, i) => makeDraft({ id: `d${i}` }))),
  } as unknown as DraftStatementRepository)

const reduce = (chantierId = 'chantier-1', contributor: typeof ADMIN | null = ADMIN) =>
  reduceChantierContextUseCase({ contributor, chantierId })

const heavy = (overrides = {}) =>
  aChantier({
    status: 'waiting',
    title: 'La taxe Zucman',
    lastEventAt: '2026-11-10T10:05:00Z',
    contextTokens: 660_000,
    ...overrides,
  })

const talked = async (chantiers: ReturnType<typeof inMemoryChantiers>) => {
  await Effect.runPromise(
    chantiers.repository.addMessages('chantier-1', [
      { role: 'person', text: 'Cherchez côté Sénat.', eventId: null },
      { role: 'review', text: 'Relecture : brouillon validé.', eventId: null },
      { role: 'agent', text: 'Douze brouillons postés.', eventId: 'evt_1' },
    ]),
  )
}

describe('reduceChantierContextUseCase', () => {
  it('opens a new session on what the thread says, and moves the chantier to it', async () => {
    const chantiers = inMemoryChantiers([heavy()])
    await talked(chantiers)
    await Effect.runPromise(
      chantiers.repository.noteSources('chantier-1', [
        { url: 'https://senat.fr/a', note: 'Compte rendu de séance.' },
        { url: 'https://lemonde.fr/b', note: 'Tribune, liste des signataires.' },
      ]),
    )
    const { agent, calls } = fakeAgent({
      reopen: Effect.succeed({ sessionId: 'sesn_2' }),
      spend: Effect.succeed({ spend: { spentCents: 8161, capCents: 9000 }, settled: true }),
    })
    const result = await runWith(
      Layer.merge(chantierFakes(chantiers.repository, agent), holding(212)),
    )(reduce())

    expect(calls.reopened).toEqual([
      {
        id: 'chantier-1',
        brief: heavy().brief,
        title: 'La taxe Zucman',
        existingDrafts: 212,
        handover: 'La personne : Cherchez côté Sénat.\n\nVous : Douze brouillons postés.',
        notedSources: 2,
      },
    ])
    expect(Either.isRight(result)).toBe(true)
    expect(chantiers.rows.get('chantier-1')).toMatchObject({
      sessionId: 'sesn_2',
      status: 'working',
      lastEventAt: null,
      contextTokens: null,
    })
  })

  it('remembers the session it leaves and what it had spent, and does not erase it', async () => {
    const chantiers = inMemoryChantiers([
      heavy({ earlierSpentCents: 500, pastSessionIds: ['sesn_0'] }),
    ])
    const { agent, calls } = fakeAgent({
      reopen: Effect.succeed({ sessionId: 'sesn_2' }),
      spend: Effect.succeed({ spend: { spentCents: 8161, capCents: 9000 }, settled: true }),
    })
    await runWith(Layer.merge(chantierFakes(chantiers.repository, agent), holding(0)))(reduce())

    expect(calls.spendAsked).toEqual(['sesn_1'])
    expect(chantiers.rows.get('chantier-1')).toMatchObject({
      earlierSpentCents: 8661,
      pastSessionIds: ['sesn_0', 'sesn_1'],
    })
    expect(calls.forgotten).toHaveLength(0)
  })

  it('leaves the reviews kept for the agent where they are: the new session hears them when asked', async () => {
    const chantiers = inMemoryChantiers([heavy()])
    await Effect.runPromise(chantiers.repository.keepUnheard('chantier-1', 'Relecture : une.'))
    const { agent, calls } = fakeAgent()
    await runWith(Layer.merge(chantierFakes(chantiers.repository, agent), holding(0)))(reduce())

    expect(chantiers.unheard).toHaveLength(1)
    expect(calls.told).toHaveLength(0)
  })

  it('refuses while the agent is at work: what it is doing would be lost', async () => {
    const chantiers = inMemoryChantiers([heavy({ status: 'working' })])
    const { agent, calls } = fakeAgent()
    const result = await runWith(
      Layer.merge(chantierFakes(chantiers.repository, agent), holding(0)),
    )(reduce())

    expect(result).toEqual(Either.left(AGENT_AT_WORK))
    expect(calls.reopened).toHaveLength(0)
    expect(chantiers.rows.get('chantier-1')?.sessionId).toBe('sesn_1')
  })

  it('leaves the chantier on its session when the new one cannot be opened', async () => {
    const chantiers = inMemoryChantiers([heavy()])
    const { agent } = fakeAgent({ reopen: Effect.fail(new AgentUnavailable('Injoignable.')) })
    const result = await runWith(
      Layer.merge(chantierFakes(chantiers.repository, agent), holding(0)),
    )(reduce())

    expect(result).toEqual(Either.left('Injoignable.'))
    expect(chantiers.rows.get('chantier-1')).toMatchObject({
      sessionId: 'sesn_1',
      status: 'waiting',
      contextTokens: 660_000,
      pastSessionIds: [],
    })
  })

  it('erases the session it just opened when the chantier cannot be moved to it: none runs unseen', async () => {
    const chantiers = inMemoryChantiers([heavy()])
    const unwritable = {
      ...chantiers.repository,
      update: () => Effect.fail(new DatabaseError('La base ne répond pas.')),
    }
    const { agent, calls } = fakeAgent({ reopen: Effect.succeed({ sessionId: 'sesn_2' }) })

    await expect(
      runWith(Layer.merge(chantierFakes(unwritable, agent), holding(0)))(reduce()),
    ).rejects.toThrow()
    expect(calls.forgotten).toEqual(['sesn_2'])
    expect(chantiers.rows.get('chantier-1')?.sessionId).toBe('sesn_1')
  })

  it('refuses a closed chantier, and one whose agent was never launched', async () => {
    const closed = inMemoryChantiers([heavy({ status: 'closed' })])
    const pending = inMemoryChantiers([heavy({ status: 'pending', sessionId: null })])
    const { agent, calls } = fakeAgent()

    expect(
      await runWith(Layer.merge(chantierFakes(closed.repository, agent), holding(0)))(reduce()),
    ).toEqual(Either.left(CHANTIER_CLOSED))
    expect(
      await runWith(Layer.merge(chantierFakes(pending.repository, agent), holding(0)))(reduce()),
    ).toEqual(Either.left(NO_SESSION))
    expect(calls.reopened).toHaveLength(0)
  })

  it('refuses who is not an admin', async () => {
    const chantiers = inMemoryChantiers([heavy()])
    const { agent, calls } = fakeAgent()
    const fakes = Layer.merge(chantierFakes(chantiers.repository, agent), holding(0))

    expect(Either.isLeft(await runWith(fakes)(reduce('chantier-1', null)))).toBe(true)
    expect(
      Either.isLeft(await runWith(fakes)(reduce('chantier-1', { id: 'someone', reputation: 10 }))),
    ).toBe(true)
    expect(calls.reopened).toHaveLength(0)
  })
})
