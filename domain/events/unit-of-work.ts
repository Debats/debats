import { Context, Effect } from 'effect'
import { DatabaseError } from '../repositories/errors'
import { EventStore } from './event-store'

/**
 * Runs a command against the journal, atomically with the projections its
 * events drive. The command only sees the journal; its own failure comes
 * back typed, as it went in. Implemented in infra/events/unit-of-work.ts,
 * and in memory for tests.
 */
export type RunUnitOfWork = <A, E>(
  work: (events: EventStore) => Effect.Effect<A, E>,
) => Effect.Effect<A, E | DatabaseError>

/** The unit of work a command asks for: the action provides the live one, a test the in-memory one */
export const UnitOfWork = Context.GenericTag<RunUnitOfWork>('UnitOfWork')

/** The command's transaction, on whichever unit of work is provided */
export const runUnitOfWork = <A, E>(
  work: (events: EventStore) => Effect.Effect<A, E>,
): Effect.Effect<A, E | DatabaseError, RunUnitOfWork> =>
  Effect.flatMap(UnitOfWork, (run) => run(work))
