import { Effect, pipe } from 'effect'
import {
  decodeStatementEvent,
  StatementAddedPayload,
  StatementContent,
  StatementEvent,
} from '../../domain/aggregates/statement-events'
import { StoredEvent } from '../../domain/events/event-store'
import { databaseError } from '../database/database-error'
import { PrismaTransaction } from '../prisma/client'
import type { Projector } from './projectors'

/**
 * Keeps the statements and argument_statements tables in step with the
 * statement stream. Idempotent: replaying the journal rebuilds both tables.
 */
export const projectStatement: Projector = (event, tx) =>
  pipe(
    decodeStatementEvent(event),
    Effect.mapError((unreadable) => databaseError('Unreadable statement event', unreadable)),
    Effect.flatMap((decoded) =>
      Effect.tryPromise({
        try: () => apply(decoded, event, tx),
        catch: (error) => databaseError('Failed to project the statement', error),
      }),
    ),
  )

async function apply(decoded: StatementEvent, stored: StoredEvent, tx: PrismaTransaction) {
  const id = stored.streamId
  switch (decoded.type) {
    case 'StatementAdded':
    case 'StatementImported':
      await createRowIfMissing(tx, stored, decoded.payload)
      await syncArguments(tx, id, decoded.payload.argumentIds, stored.actorId)
      return
    case 'StatementEdited':
      await tx.statements.update({
        where: { id },
        data: { ...contentColumns(decoded.payload), updated_at: stored.occurredAt },
      })
      await syncArguments(tx, id, decoded.payload.argumentIds, stored.actorId)
      return
    case 'StatementMoved':
      await tx.statements.update({
        where: { id },
        data: { position_id: decoded.payload.positionId, updated_at: stored.occurredAt },
      })
      return
    case 'StatementArgumentsSet':
      await tx.statements.update({ where: { id }, data: { updated_at: stored.occurredAt } })
      await syncArguments(tx, id, decoded.payload.argumentIds, stored.actorId)
      return
    case 'StatementDeleted':
      await tx.statements.update({
        where: { id },
        data: { deleted_at: stored.occurredAt, updated_at: stored.occurredAt },
      })
      return
  }
}

/** An import finds its row already there; a replay from scratch creates it */
async function createRowIfMissing(
  tx: PrismaTransaction,
  stored: StoredEvent,
  payload: StatementAddedPayload,
) {
  const found = await tx.statements.findUnique({
    where: { id: stored.streamId },
    select: { id: true },
  })
  if (found) return
  await tx.statements.create({
    data: {
      id: stored.streamId,
      public_figure_id: payload.author.kind === 'public_figure' ? payload.author.id : null,
      organisation_id: payload.author.kind === 'organisation' ? payload.author.id : null,
      ...contentColumns(payload),
      created_by: stored.actorId,
      created_at: stored.occurredAt,
      updated_at: stored.occurredAt,
    },
  })
}

function contentColumns(content: StatementContent) {
  return {
    position_id: content.positionId,
    statement_type: content.statementType,
    source_name: content.sourceName,
    source_url: content.sourceUrl ?? null,
    quote: content.quote,
    stated_at: new Date(content.statedAt),
  }
}

/** Brings the links to the wanted set, touching only what changes */
async function syncArguments(
  tx: PrismaTransaction,
  statementId: string,
  wanted: readonly string[],
  actorId: string | null,
) {
  const current = await tx.argument_statements.findMany({
    where: { statement_id: statementId },
    select: { argument_id: true },
  })
  const currentIds = new Set(current.map((link) => link.argument_id))
  const missing = wanted.filter((id) => !currentIds.has(id))
  const extra = Array.from(currentIds).filter((id) => !wanted.includes(id))

  if (extra.length > 0) {
    await tx.argument_statements.deleteMany({
      where: { statement_id: statementId, argument_id: { in: extra } },
    })
  }
  if (missing.length > 0) {
    if (!actorId) throw new Error('Cannot link arguments without an actor')
    await tx.argument_statements.createMany({
      data: missing.map((argument_id) => ({
        statement_id: statementId,
        argument_id,
        created_by: actorId,
      })),
    })
  }
}
