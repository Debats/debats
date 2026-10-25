import { Cause, Effect, Exit } from 'effect'
import { EventStore } from '../../domain/events/event-store'
import { ProcessState } from '../../domain/events/unit-of-work'
import { DatabaseError } from '../../domain/repositories/errors'
import { databaseError } from '../database/database-error'
import { getPrismaClient, PrismaTransaction } from '../prisma/client'
import { createEventStore } from './event-store-prisma'
import { createProcessState } from './process-state-prisma'
import { withProjections } from './projecting-event-store'
import { ProjectorRegistry } from './projector'
import { projectors } from './projectors'

/** Carries the command's own failure out of the transaction, which it rolls back */
class RolledBack<E> {
  constructor(readonly cause: Cause.Cause<E>) {}
}

/**
 * Runs a command in one database transaction: the events it appends, the
 * projections they drive and the process state it writes commit together,
 * or not at all. The command only sees the journal and the process state;
 * its own failure rolls everything back and comes out typed, as it went in.
 */
export function runUnitOfWork<A, E>(
  work: (events: EventStore, process: ProcessState) => Effect.Effect<A, E>,
  registry: ProjectorRegistry = projectors,
): Effect.Effect<A, E | DatabaseError> {
  return Effect.tryPromise<A, unknown>({
    try: () => runInTransaction(work, registry),
    catch: (error) => error,
  }).pipe(Effect.catchAll((error) => failureOf<E>(error)))
}

/**
 * A command only reads and writes the journal and its projections: a few
 * statements, plus one per statement a cascade reaches. The waits are
 * explicit rather than Prisma's defaults (2 s to get a connection, 5 s to
 * finish), so that a wide cascade fails for a reason, not for the clock.
 */
const TRANSACTION = { maxWait: 5_000, timeout: 30_000 }

function runInTransaction<A, E>(
  work: (events: EventStore, process: ProcessState) => Effect.Effect<A, E>,
  registry: ProjectorRegistry,
): Promise<A> {
  return getPrismaClient().$transaction(async (tx) => {
    const exit = await Effect.runPromiseExit(work(journalOf(tx, registry), createProcessState(tx)))
    if (Exit.isFailure(exit)) throw new RolledBack(exit.cause)
    return exit.value
  }, TRANSACTION)
}

function journalOf(tx: PrismaTransaction, registry: ProjectorRegistry): EventStore {
  return withProjections(createEventStore(tx), registry, tx)
}

/** The command's own failure comes back as it went in; anything else is a database error */
function failureOf<E>(error: unknown): Effect.Effect<never, E | DatabaseError> {
  return error instanceof RolledBack
    ? Effect.failCause(error.cause as Cause.Cause<E>)
    : Effect.fail(databaseError('Transaction failed', error))
}
