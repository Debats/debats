import { Clock, Context, Effect } from 'effect'
import { DatabaseError } from '../repositories/errors'
import { withDate } from './dated-event-store'
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

/**
 * The command's transaction, on whichever unit of work is provided. The clock
 * is read once, before the transaction opens: that instant is when the command
 * was taken. Every fact it writes carries it, and a decision that judges on
 * time (an affiliation still running, a date already past) judges on it — the
 * command receives it rather than reading a clock of its own. The clock is the
 * application's, not Postgres's: ADR 0001 says what that costs.
 */
export const runUnitOfWork = <A, E>(
  work: (events: EventStore, happenedAt: Date) => Effect.Effect<A, E>,
): Effect.Effect<A, E | DatabaseError, RunUnitOfWork> =>
  Effect.flatMap(Clock.currentTimeMillis, (millis) => {
    const happenedAt = new Date(millis)
    return Effect.flatMap(UnitOfWork, (run) =>
      run((events) => work(withDate(events, happenedAt), happenedAt)),
    )
  })
