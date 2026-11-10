import { Effect, Layer } from 'effect'
import { Chantier, ChantierMessage } from '../entities/chantier'
import {
  ChantierRepository,
  ChantierUpdate,
  NewChantier,
  NewChantierMessage,
} from '../repositories/chantier-repository'
import { AgentNews, AgentUnavailable, ChantierAgent } from '../services/chantier-agent'

export const ADMIN = { id: 'admin-uuid', reputation: 1_000_000 }

export const aChantier = (overrides: Partial<Chantier> = {}): Chantier => ({
  id: 'chantier-1',
  brief: 'Qui s’est positionné sur la taxe Zucman ?',
  title: null,
  status: 'working',
  sessionId: 'sesn_1',
  lastEventAt: null,
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
  }

  return { repository, rows, messages }
}

export type AgentCalls = {
  opened: string[]
  told: { sessionId: string; text: string }[]
  interrupted: string[]
}

/** An agent that answers what the test says, and remembers what it was asked */
export function fakeAgent(
  behaviour: {
    open?: Effect.Effect<{ sessionId: string }, AgentUnavailable>
    news?: AgentNews
    tell?: Effect.Effect<void, AgentUnavailable>
  } = {},
) {
  const calls: AgentCalls = { opened: [], told: [], interrupted: [] }
  const agent: ChantierAgent = {
    open: ({ id }) =>
      Effect.suspend(() => {
        calls.opened.push(id)
        return behaviour.open ?? Effect.succeed({ sessionId: `sesn_for_${id}` })
      }),
    tell: (sessionId, text) =>
      Effect.suspend(() => {
        calls.told.push({ sessionId, text })
        return behaviour.tell ?? Effect.void
      }),
    newsSince: () =>
      Effect.succeed(behaviour.news ?? { status: 'working', messages: [], until: null }),
    interrupt: (sessionId) =>
      Effect.sync(() => {
        calls.interrupted.push(sessionId)
      }),
  }
  return { agent, calls }
}

export const chantierFakes = (repository: ChantierRepository, agent: ChantierAgent) =>
  Layer.mergeAll(Layer.succeed(ChantierRepository, repository), Layer.succeed(ChantierAgent, agent))
