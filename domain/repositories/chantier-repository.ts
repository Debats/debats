import { Context, Effect } from 'effect'
import {
  Chantier,
  ChantierMessage,
  ChantierMessageRole,
  ChantierStatus,
} from '../entities/chantier'
import { AgentSpend } from '../services/chantier-budget'
import { ChantierSource } from '../services/chantier-sources'
import { DatabaseError } from './errors'

export type NewChantier = {
  brief: string
  createdBy: string
  /** Given when the chantier adopts drafts already there; the agent names the others */
  title?: string | null
  /** 'pending' for an adopted chantier whose agent is not launched; 'working' by default */
  status?: ChantierStatus
}

/** What may change on a chantier once it exists: the rest is its birth */
export type ChantierUpdate = Partial<
  Pick<
    Chantier,
    | 'title'
    | 'status'
    | 'sessionId'
    | 'lastEventAt'
    | 'sections'
    | 'contextTokens'
    | 'earlierSpentCents'
    | 'pastSessionIds'
  >
>

export type NewChantierMessage = {
  role: ChantierMessageRole
  text: string
  /** The session event this mirrors; a message a person sent from the site has none */
  eventId: string | null
}

/** A review notice the agent of a chantier has not heard yet, kept until it does */
export type UnheardNotice = {
  id: string
  text: string
}

/**
 * Chantiers are process state, written directly: no journal, no projection.
 * Messages are append-only; one that mirrors an event already mirrored is
 * not written twice.
 */
export interface ChantierRepository {
  create(chantier: NewChantier): Effect.Effect<Chantier, DatabaseError>
  findById(id: string): Effect.Effect<Chantier | null, DatabaseError>
  /** Every chantier, the most recently touched first */
  findAll(): Effect.Effect<Chantier[], DatabaseError>
  update(
    id: string,
    fields: ChantierUpdate,
    updatedBy: string,
  ): Effect.Effect<Chantier | null, DatabaseError>
  addMessages(
    chantierId: string,
    messages: NewChantierMessage[],
  ): Effect.Effect<ChantierMessage[], DatabaseError>
  /** The conversation in order */
  findMessages(chantierId: string): Effect.Effect<ChantierMessage[], DatabaseError>
  /** Keeps a review notice for the agent, to be told later; it is not in the thread until then. The notice of a draft takes the place of the one kept for that draft before, and comes last */
  keepUnheard(
    chantierId: string,
    text: string,
    draftId?: string,
  ): Effect.Effect<void, DatabaseError>
  /** What the agent has still to be told, the oldest first */
  findUnheard(chantierId: string): Effect.Effect<UnheardNotice[], DatabaseError>
  /** Lets go of the notices the agent has now heard */
  forgetUnheard(ids: readonly string[]): Effect.Effect<void, DatabaseError>
  /** Writes sources in the notebook of the chantier; an address already there takes its new note */
  noteSources(
    chantierId: string,
    sources: readonly ChantierSource[],
  ): Effect.Effect<void, DatabaseError>
  /** The notebook of the chantier, in the order the addresses were first noted */
  findSources(chantierId: string): Effect.Effect<ChantierSource[], DatabaseError>
  /** Keeps what the agent of a closed chantier spent. Not a person's edit: the chantier keeps its place in the list and its last editor */
  keepSpend(id: string, spend: AgentSpend): Effect.Effect<void, DatabaseError>
  /** Removes the chantier with everything it owns: its conversation and the drafts it produced */
  delete(id: string): Effect.Effect<void, DatabaseError>
}

export const ChantierRepository = Context.GenericTag<ChantierRepository>('ChantierRepository')
