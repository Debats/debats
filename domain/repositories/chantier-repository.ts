import { Context, Effect } from 'effect'
import { Chantier, ChantierMessage, ChantierMessageRole } from '../entities/chantier'
import { DatabaseError } from './errors'

export type NewChantier = {
  brief: string
  createdBy: string
}

/** What may change on a chantier once it exists: the rest is its birth */
export type ChantierUpdate = Partial<
  Pick<Chantier, 'title' | 'status' | 'sessionId' | 'lastEventAt'>
>

export type NewChantierMessage = {
  role: ChantierMessageRole
  text: string
  /** The session event this mirrors; a message a person sent from the site has none */
  eventId: string | null
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
}

export const ChantierRepository = Context.GenericTag<ChantierRepository>('ChantierRepository')
