import { describe, expect, it } from 'vitest'
import { Effect, Either } from 'effect'
import { AgentNews } from '../services/chantier-agent'
import {
  aChantier,
  ADMIN,
  chantierFakes,
  fakeAgent,
  inMemoryChantiers,
} from './chantier-test-helpers'
import { runWith } from './command-test-helpers'
import { changesFrom, refreshChantierUseCase } from './refresh-chantier'

const news = (overrides: Partial<AgentNews> = {}): AgentNews => ({
  status: 'waiting',
  messages: [
    { eventId: 'evt_1', role: 'person', text: 'Qui s’est positionné sur la taxe Zucman ?' },
    { eventId: 'evt_2', role: 'agent', text: '# La taxe Zucman\n\nJe commence par le Sénat.' },
  ],
  until: '2026-11-10T10:05:00Z',
  budget: null,
  contextTokens: null,
  ...overrides,
})

describe('changesFrom', () => {
  it('takes the agent’s status, names the chantier on its first answer and moves the cursor', () => {
    expect(changesFrom(aChantier(), news())).toEqual({
      status: 'waiting',
      title: 'La taxe Zucman',
      lastEventAt: '2026-11-10T10:05:00Z',
    })
  })

  it('takes the size of the agent’s context when the news read one, and keeps the last known otherwise', () => {
    expect(changesFrom(aChantier(), news({ contextTokens: 412_000 }))).toMatchObject({
      contextTokens: 412_000,
    })
    expect(changesFrom(aChantier({ contextTokens: 412_000 }), news())).not.toHaveProperty(
      'contextTokens',
    )
  })

  it('keeps the name the chantier already has', () => {
    expect(changesFrom(aChantier({ title: 'Mon chantier' }), news())).not.toHaveProperty('title')
  })

  it('keeps a chantier a person closed closed, whatever the agent does', () => {
    expect(
      changesFrom(aChantier({ status: 'closed' }), news({ status: 'working' })),
    ).not.toHaveProperty('status')
  })

  it('keeps an agent at work until it answers: an idle session may not have taken the message yet', () => {
    expect(
      changesFrom(aChantier({ status: 'working' }), news({ messages: [], until: null })),
    ).toEqual({})
    expect(
      changesFrom(aChantier({ status: 'waiting' }), news({ messages: [], until: null })),
    ).toEqual({ status: 'waiting' })
  })

  it('lets a blocked or ended session through even without an answer', () => {
    expect(
      changesFrom(aChantier({ status: 'working' }), news({ status: 'blocked', messages: [] })),
    ).toMatchObject({ status: 'blocked' })
    expect(
      changesFrom(aChantier({ status: 'working' }), news({ status: 'ended', messages: [] })),
    ).toMatchObject({ status: 'ended' })
  })
})

describe('refreshChantierUseCase', () => {
  it('mirrors the agent’s messages only, and returns the whole conversation', async () => {
    const chantiers = inMemoryChantiers([aChantier()])
    const { agent } = fakeAgent({ news: news() })
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      refreshChantierUseCase({ contributor: ADMIN, chantierId: 'chantier-1' }),
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.chantier.title).toBe('La taxe Zucman')
      expect(result.right.chantier.status).toBe('waiting')
      expect(result.right.chantier.lastEventAt).toBe('2026-11-10T10:05:00Z')
      expect(result.right.messages.map(({ role, eventId }) => ({ role, eventId }))).toEqual([
        { role: 'agent', eventId: 'evt_2' },
      ])
    }
  })

  it('mirrors an event once, however many times it is read', async () => {
    const chantiers = inMemoryChantiers([aChantier()])
    const { agent } = fakeAgent({ news: news() })
    const execute = runWith(chantierFakes(chantiers.repository, agent))
    await execute(refreshChantierUseCase({ contributor: ADMIN, chantierId: 'chantier-1' }))
    const again = await execute(
      refreshChantierUseCase({ contributor: ADMIN, chantierId: 'chantier-1' }),
    )

    expect(Either.isRight(again)).toBe(true)
    if (Either.isRight(again)) expect(again.right.messages).toHaveLength(1)
  })

  it('says what the session spent against its cap', async () => {
    const chantiers = inMemoryChantiers([aChantier()])
    const budget = { spentCents: 2173, capCents: 2000, reached: true }
    const { agent } = fakeAgent({ news: news({ status: 'blocked', budget }) })
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      refreshChantierUseCase({ contributor: ADMIN, chantierId: 'chantier-1' }),
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) expect(result.right.budget).toEqual(budget)
  })

  it('says how many reviews wait to be handed to the agent', async () => {
    const chantiers = inMemoryChantiers([aChantier()])
    await Effect.runPromise(chantiers.repository.keepUnheard('chantier-1', 'Relecture : une.'))
    await Effect.runPromise(chantiers.repository.keepUnheard('chantier-1', 'Relecture : deux.'))
    await Effect.runPromise(chantiers.repository.keepUnheard('chantier-2', 'Relecture : ailleurs.'))
    const { agent } = fakeAgent({ news: news() })
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      refreshChantierUseCase({ contributor: ADMIN, chantierId: 'chantier-1' }),
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) expect(result.right.reviewsWaiting).toBe(2)
  })

  it('says how many pages the notebook of the chantier holds', async () => {
    const chantiers = inMemoryChantiers([aChantier()])
    await Effect.runPromise(
      chantiers.repository.noteSources('chantier-1', [
        { url: 'https://senat.fr/a', note: 'Compte rendu de séance.' },
        { url: 'https://senat.fr/a', note: 'Compte rendu de séance, corrigé.' },
        { url: 'https://lemonde.fr/b', note: 'Tribune.' },
      ]),
    )
    const { agent } = fakeAgent({ news: news() })
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      refreshChantierUseCase({ contributor: ADMIN, chantierId: 'chantier-1' }),
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) expect(result.right.sourcesNoted).toBe(2)
  })

  it('shows what a closed chantier kept of its spend, without asking its session', async () => {
    const kept = { spentCents: 412, capCents: 2000 }
    const chantiers = inMemoryChantiers([aChantier({ status: 'closed', spend: kept })])
    const { agent, calls } = fakeAgent({
      news: news({ budget: { spentCents: 100, capCents: 2000, reached: true } }),
    })
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      refreshChantierUseCase({ contributor: ADMIN, chantierId: 'chantier-1' }),
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) expect(result.right.budget).toEqual({ ...kept, reached: false })
    expect(calls.newsAsked).toEqual([])
    expect(calls.spendAsked).toEqual([])
  })

  it('asks the session of a closed chantier that kept nothing yet, and keeps what it spent', async () => {
    const spent = { spentCents: 2000, capCents: 2000 }
    const chantiers = inMemoryChantiers([aChantier({ status: 'closed' })])
    const { agent } = fakeAgent({ spend: Effect.succeed({ spend: spent, settled: true }) })
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      refreshChantierUseCase({ contributor: ADMIN, chantierId: 'chantier-1' }),
    )

    expect(Either.isRight(result)).toBe(true)
    /* Closed, the agent is not stopped by its cap: nothing is left to resume */
    if (Either.isRight(result)) expect(result.right.budget).toEqual({ ...spent, reached: false })
    expect(chantiers.rows.get('chantier-1')?.spend).toEqual(spent)
  })

  it('knows no budget for a closed chantier whose session runs without a cap', async () => {
    const chantiers = inMemoryChantiers([aChantier({ status: 'closed' })])
    const { agent } = fakeAgent()
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      refreshChantierUseCase({ contributor: ADMIN, chantierId: 'chantier-1' }),
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) expect(result.right.budget).toBeNull()
  })

  it('reads a chantier without a session as it is', async () => {
    const chantiers = inMemoryChantiers([aChantier({ sessionId: null, status: 'ended' })])
    const { agent } = fakeAgent({ news: news() })
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      refreshChantierUseCase({ contributor: ADMIN, chantierId: 'chantier-1' }),
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.chantier.status).toBe('ended')
      expect(result.right.messages).toHaveLength(0)
    }
  })

  it('says when the chantier does not exist', async () => {
    const chantiers = inMemoryChantiers()
    const { agent } = fakeAgent()
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      refreshChantierUseCase({ contributor: ADMIN, chantierId: 'nope' }),
    )

    expect(Either.isLeft(result)).toBe(true)
  })
})
