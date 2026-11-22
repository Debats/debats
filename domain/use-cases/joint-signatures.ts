import { Effect, pipe } from 'effect'
import { addStatement, StatementAddition } from '../aggregates/statement'
import { StatementId } from '../entities/statement'
import { EventStore } from '../events/event-store'
import { openStream } from './aggregate-stream'
import { statementAggregate } from './statement-stream'

/**
 * Opens the stream of each statement a signature makes, inside the
 * transaction that recorded the signatory or the position: a joint
 * declaration and the statements of its signatories are written together or
 * not at all, so that nobody ever signs half a text.
 */
export const recordSignatures = (
  events: EventStore,
  actorId: string,
  signatures: readonly StatementAddition[],
) =>
  Effect.forEach(signatures, (signature) =>
    pipe(
      // The command names each statement: its stream exists from its first event
      openStream(
        statementAggregate,
        events,
        StatementId.make(crypto.randomUUID()),
        addStatement(signature),
        actorId,
      ),
      Effect.map(({ state }) => state.statement),
    ),
  )
