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
 * statements belong to the statement projector.
 */
export const projectArgument = projectorOf('argument', decodeArgumentEvent, apply)

async function apply(decoded: ArgumentEvent, stored: StoredEvent, tx: PrismaTransaction) {
  const id = stored.streamId
  switch (decoded.type) {
    case 'ArgumentAdded':
      return create(tx, stored, decoded.payload)
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

async function create(tx: PrismaTransaction, stored: StoredEvent, payload: ArgumentWording) {
  await tx.arguments.create({
    data: { id: stored.streamId, ...columns(payload), ...auditOf(stored, 'an argument') },
  })
}
