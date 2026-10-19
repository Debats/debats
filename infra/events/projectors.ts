import { Effect } from 'effect'
import { STATEMENT_STREAM } from '../../domain/aggregates/statement'
import { SUBJECT_STREAM } from '../../domain/aggregates/subject'
import { StoredEvent } from '../../domain/events/event-store'
import { DatabaseError } from '../../domain/repositories/errors'
import { PrismaTransaction } from '../prisma/client'
import { projectStatement } from './statement-projector'
import { projectSubject } from './subject-projector'

/**
 * Keeps one table in step with the events of one stream type. A projector
 * reads only the event, is idempotent, and runs in the transaction that
 * appended the event. Replaying the journal through it rebuilds the table.
 */
export type Projector = (
  event: StoredEvent,
  tx: PrismaTransaction,
) => Effect.Effect<void, DatabaseError>

/** Projectors by stream type; an aggregate registers its own when it switches to the journal */
export type ProjectorRegistry = Readonly<Record<string, readonly Projector[]>>

export const projectors: ProjectorRegistry = {
  [STATEMENT_STREAM]: [projectStatement],
  [SUBJECT_STREAM]: [projectSubject],
}
