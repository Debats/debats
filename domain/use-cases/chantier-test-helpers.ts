import { Effect, Layer } from 'effect'
import { Chantier, ChantierMessage } from '../entities/chantier'
import {
  ChantierRepository,
  ChantierUpdate,
  NewChantier,
  NewChantierMessage,
} from '../repositories/chantier-repository'
import { AgentNews, AgentUnavailable, ChantierAgent } from '../services/chantier-agent'
import { AgentBudget, SpendReading } from '../services/chantier-budget'

export const ADMIN = { id: 'admin-uuid', reputation: 1_000_000 }

export const aChantier = (overrides: Partial<Chantier> = {}): Chantier => ({
  id: 'chantier-1',
  brief: 'Qui s’est positionné sur la taxe Zucman ?',
  title: null,
  status: 'working',
  sessionId: 'sesn_1',
  lastEventAt: null,
  sections: [],
  spend: null,
  createdBy: ADMIN.id,
  updatedBy: ADMIN.id,
  createdAt: new Date('2026-11-10T10:00:00Z'),
  updatedAt: new Date('2026-11-10T10:00:00Z'),
  ...overrides,
})

/** A chantier repository in memory: what a test seeds, and what the command wrote */
export function inMemoryChantiers(seed: Chantier[] = []) {
  const rows = new Map(seed.map((chantier) => [chantier.id, chantier]))
  const messages: ChantierMessage[] = []
  let next = 1

  const repository: ChantierRepository = {
    create: (chantier: NewChantier) =>
      Effect.sync(() => {
        const created = aChantier({
          id: `chantier-${rows.size + 1}`,
          brief: chantier.brief,
          title: chantier.title ?? null,
          status: chantier.status ?? 'working',
          sessionId: null,
          createdBy: chantier.createdBy,
          updatedBy: chantier.createdBy,
        })
        rows.set(created.id, created)
        return created
      }),
    findById: (id) => Effect.sync(() => rows.get(id) ?? null),
    findAll: () => Effect.sync(() => Array.from(rows.values())),
    update: (id, fields: ChantierUpdate, updatedBy) =>
      Effect.sync(() => {
        const current = rows.get(id)
        if (!current) return null
        const updated = { ...current, ...fields, updatedBy }
        rows.set(id, updated)
        return updated
      }),
    addMessages: (chantierId, added: NewChantierMessage[]) =>
      Effect.sync(() =>
        added.flatMap((message) => {
          if (message.eventId && messages.some((m) => m.eventId === message.eventId)) return []
          const stored: ChantierMessage = {
            id: `message-${next++}`,
            chantierId,
            ...message,
            createdAt: new Date(),
          }
          messages.push(stored)
          return [stored]
        }),
      ),
    findMessages: (chantierId) =>
      Effect.sync(() => messages.filter((m) => m.chantierId === chantierId)),
    keepSpend: (id, spend) =>
      Effect.sync(() => {
        const current = rows.get(id)
        if (current) rows.set(id, { ...current, spend })
      }),
    delete: (id) =>
      Effect.sync(() => {
        rows.delete(id)
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].chantierId === id) messages.splice(i, 1)
        }
      }),
  }

  return { repository, rows, messages }
}

export type AgentCalls = {
  opened: {
    id: string
    brief: string
    title: string | null
    existingDrafts: number
    recap: string | null
  }[]
  told: { sessionId: string; text: string }[]
  /** The sessions asked for their news */
  newsAsked: string[]
  /** The sessions asked what they spent */
  spendAsked: string[]
  pushed: { sessionId: string; stepCents: number }[]
  interrupted: string[]
  forgotten: string[]
}

/** An agent that answers what the test says, and remembers what it was asked */
export function fakeAgent(
  behaviour: {
    open?: Effect.Effect<{ sessionId: string }, AgentUnavailable>
    news?: AgentNews
    tell?: Effect.Effect<void, AgentUnavailable>
    spend?: Effect.Effect<SpendReading, AgentUnavailable>
    push?: Effect.Effect<AgentBudget, AgentUnavailable>
    forget?: Effect.Effect<void, AgentUnavailable>
  } = {},
) {
  const calls: AgentCalls = {
    opened: [],
    told: [],
    newsAsked: [],
    spendAsked: [],
    pushed: [],
    interrupted: [],
    forgotten: [],
  }
  const agent: ChantierAgent = {
    open: (chantier) =>
      Effect.suspend(() => {
        calls.opened.push(chantier)
        return behaviour.open ?? Effect.succeed({ sessionId: `sesn_for_${chantier.id}` })
      }),
    tell: (sessionId, text) =>
      Effect.suspend(() => {
        calls.told.push({ sessionId, text })
        return behaviour.tell ?? Effect.void
      }),
    newsSince: (sessionId) =>
      Effect.sync(() => {
        calls.newsAsked.push(sessionId)
        return behaviour.news ?? { status: 'working', messages: [], until: null, budget: null }
      }),
    spend: (sessionId) =>
      Effect.suspend(() => {
        calls.spendAsked.push(sessionId)
        return behaviour.spend ?? Effect.succeed({ spend: null, settled: true })
      }),
    pushBudget: (sessionId, stepCents) =>
      Effect.suspend(() => {
        calls.pushed.push({ sessionId, stepCents })
        return (
          behaviour.push ??
          Effect.succeed({ spentCents: 2173, capCents: 2000 + stepCents, reached: false })
        )
      }),
    interrupt: (sessionId) =>
      Effect.sync(() => {
        calls.interrupted.push(sessionId)
      }),
    forget: (sessionId) =>
      Effect.suspend(() => {
        calls.forgotten.push(sessionId)
        return behaviour.forget ?? Effect.void
      }),
  }
  return { agent, calls }
}

export const chantierFakes = (repository: ChantierRepository, agent: ChantierAgent) =>
  Layer.mergeAll(Layer.succeed(ChantierRepository, repository), Layer.succeed(ChantierAgent, agent))
