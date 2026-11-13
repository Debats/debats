import { Context, Effect } from 'effect'
import { ChantierMessageRole } from '../entities/chantier'
import { AgentBudget } from './chantier-budget'

/**
 * The agent that works a chantier, as the domain sees it: a session is
 * opened on a brief, told things, and asked what is new since last time.
 * How the session runs, where, with which tools, is the adapter's business.
 */

/** What the agent is doing, as far as the site can tell */
export type AgentStatus = 'working' | 'waiting' | 'blocked' | 'ended'

export type AgentMessage = {
  /** The session event the message is, so it is mirrored once */
  eventId: string
  role: ChantierMessageRole
  text: string
}

export type AgentNews = {
  status: AgentStatus
  messages: AgentMessage[]
  /** When the last event read was processed: the cursor for the next reading; null when nothing was read */
  until: string | null
  /** What the session spent against its cap; null when it runs without one */
  budget: AgentBudget | null
}

/** The agent could not be reached, or refused what it was sent; the person reads why */
export class AgentUnavailable {
  readonly _tag = 'AgentUnavailable'
  constructor(
    readonly message: string,
    readonly cause?: unknown,
  ) {}
}

export interface ChantierAgent {
  /** Opens a session on the brief and starts the agent on it; an adopted chantier says how many drafts it already holds, and what the pass before left */
  open(chantier: {
    id: string
    brief: string
    title: string | null
    existingDrafts: number
    recap: string | null
  }): Effect.Effect<{ sessionId: string }, AgentUnavailable>
  tell(sessionId: string, text: string): Effect.Effect<void, AgentUnavailable>
  /** What happened in the session since the cursor: messages, and where the agent stands */
  newsSince(sessionId: string, after: string | null): Effect.Effect<AgentNews, AgentUnavailable>
  /** Pushes the cap of the session further by the step given; an agent stopped at its cap resumes by itself */
  pushBudget(sessionId: string, stepCents: number): Effect.Effect<AgentBudget, AgentUnavailable>
  /** Stops what the agent is doing; it goes idle */
  interrupt(sessionId: string): Effect.Effect<void, AgentUnavailable>
  /** Ends the session and erases it where it ran; a session already gone is forgotten all the same */
  forget(sessionId: string): Effect.Effect<void, AgentUnavailable>
}

export const ChantierAgent = Context.GenericTag<ChantierAgent>('ChantierAgent')
