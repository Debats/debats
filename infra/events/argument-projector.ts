import {
  ArgumentEvent,
  ArgumentWording,
  decodeArgumentEvent,
} from '../../domain/aggregates/argument-events'
import { StoredEvent } from '../../domain/events/event-store'
import { PrismaTransaction } from '../prisma/client'
import { auditOf, changedBy, projectorOf } from './projector'

/**
 * Keeps the arguments table in step with the argument stream. The links to
 * statements belong to the statement projector. Idempotent: replaying the
 * journal rebuilds the table.
 */
export const projectArgument = projectorOf('argument', decodeArgumentEvent, apply)

async function apply(decoded: ArgumentEvent, stored: StoredEvent, tx: PrismaTransaction) {
  const id = stored.streamId
  switch (decoded.type) {
    case 'ArgumentAdded':
    case 'ArgumentImported':
      return createIfMissing(tx, stored, decoded.payload)
    case 'ArgumentRenamed':
      await tx.arguments.update({
        where: { id },
        data: { ...columns(decoded.payload), ...changedBy(stored) },
      })
      return
    case 'ArgumentMergedInto':
    case 'ArgumentDeleted':
      await tx.arguments.update({
        where: { id },
        data: { deleted_at: stored.occurredAt, ...changedBy(stored) },
      })
      return
    case 'ArgumentAbsorbed':
      // The row keeps its wording; the merge is a change to it all the same
      await tx.arguments.update({ where: { id }, data: changedBy(stored) })
      return
  }
}

function columns(wording: ArgumentWording) {
  return { title: wording.title, slug: wording.slug, description: wording.description }
}

/** An import finds its row already there; a replay from scratch creates it */
async function createIfMissing(
  tx: PrismaTransaction,
  stored: StoredEvent,
  payload: ArgumentWording,
) {
  const found = await tx.arguments.findUnique({
    where: { id: stored.streamId },
    select: { id: true },
  })
  if (found) return
  await tx.arguments.create({
    data: { id: stored.streamId, ...columns(payload), ...auditOf(stored, 'an argument') },
  })
}
