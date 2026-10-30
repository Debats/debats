import {
  decodeStatementEvent,
  StatementAddedPayload,
  StatementEvent,
  StatementFields,
} from '../../domain/aggregates/statement-events'
import { StoredEvent } from '../../domain/events/event-store'
import { PrismaTransaction } from '../prisma/client'
import { fromStatementContent } from '../database/statement-content-columns'
import { projectorOf } from './projector'

/**
 * Keeps the statements and argument_statements tables in step with the
 * statement stream.
 */
export const projectStatement = projectorOf('statement', decodeStatementEvent, apply)

async function apply(decoded: StatementEvent, stored: StoredEvent, tx: PrismaTransaction) {
  const id = stored.streamId
  switch (decoded.type) {
    case 'StatementAdded':
      await createRow(tx, stored, decoded.payload)
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

async function createRow(
  tx: PrismaTransaction,
  stored: StoredEvent,
  payload: StatementAddedPayload,
) {
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

function contentColumns(fields: StatementFields) {
  return {
    position_id: fields.positionId,
    source_name: fields.sourceName,
    source_url: fields.sourceUrl,
    stated_at: new Date(fields.statedAt),
    ...fromStatementContent(fields.content),
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
