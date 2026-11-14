import { Context, Effect } from 'effect'
import { ChantierMessageRole } from '../entities/chantier'
import { AgentBudget, SpendReading } from './chantier-budget'

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
  /** How many tokens the agent read at its last step, all it carries; null when it took no step since the cursor */
  contextTokens: number | null
}

/**
 * The agent could not be reached, or refused what it was sent; the person
 * reads why. This is a fault: the adapter reports its cause where it happens,
 * so a command that goes on without the agent has nothing left to report.
 */
export class AgentUnavailable {
  readonly _tag = 'AgentUnavailable'
  constructor(
    readonly message: string,
    readonly cause?: unknown,
  ) {}
}

export const BUDGET_REACHED =
  'L’agent a atteint son budget : il ne prend plus de message tant que vous ne l’avez pas repoussé.'

/**
 * The agent stopped at its cap and hears nothing until the cap is pushed
 * further. Not a fault: a state the chantier is expected to reach, which the
 * person is told and no one is alerted of.
 */
export class BudgetReached {
  readonly _tag = 'BudgetReached'
  readonly message = BUDGET_REACHED
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
  /** Opens a new session on a chantier under way, told what its thread said so far: the agent carries on without what the session before had piled up */
  reopen(chantier: {
    id: string
    brief: string
    title: string | null
    existingDrafts: number
    handover: string | null
    /** How many pages the notebook of the chantier holds: the agent reads them back from the site when it needs them */
    notedSources: number
  }): Effect.Effect<{ sessionId: string }, AgentUnavailable>
  /** A session stopped at its cap refuses the message, and says so apart from any other refusal */
  tell(sessionId: string, text: string): Effect.Effect<void, AgentUnavailable | BudgetReached>
  /** What happened in the session since the cursor: messages, and where the agent stands */
  newsSince(sessionId: string, after: string | null): Effect.Effect<AgentNews, AgentUnavailable>
  /** What the session spent against its cap, and whether the figures may still move; its events are left unread */
  spend(sessionId: string): Effect.Effect<SpendReading, AgentUnavailable>
  /** Pushes the cap of the session further by the step given; an agent stopped at its cap resumes by itself */
  pushBudget(sessionId: string, stepCents: number): Effect.Effect<AgentBudget, AgentUnavailable>
  /** Stops what the agent is doing; it goes idle */
  interrupt(sessionId: string): Effect.Effect<void, AgentUnavailable>
  /** Ends the session and erases it where it ran; a session already gone is forgotten all the same */
  forget(sessionId: string): Effect.Effect<void, AgentUnavailable>
}

export const ChantierAgent = Context.GenericTag<ChantierAgent>('ChantierAgent')
