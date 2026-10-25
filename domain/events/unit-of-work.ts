import { Effect } from 'effect'
import { DatabaseError } from '../repositories/errors'
import { EventStore } from './event-store'

/**
 * The process state a command may write in its transaction, beside the
 * journal: what the site tracks of a process (an invitation), not a fact of
 * the map. Written or rolled back with the events of the same command.
 */
export interface ProcessState {
  /** The pending invitation of this address is consumed by the contributor who joined */
  acceptInvitation(email: string, inviteeId: string): Effect.Effect<void, DatabaseError>
}

/**
 * Runs a command against the journal, atomically with the projections its
 * events drive and the process state it writes. The command sees the journal
 * and the process state, nothing else; its own failure comes back typed, as
 * it went in. Implemented in infra/events/unit-of-work.ts, and in memory for
 * tests.
 */
export type RunUnitOfWork = <A, E>(
  work: (events: EventStore, process: ProcessState) => Effect.Effect<A, E>,
) => Effect.Effect<A, E | DatabaseError>
