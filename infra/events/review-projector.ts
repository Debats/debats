import { decodeReviewEvent, FlagPayload, ReviewEvent } from '../../domain/aggregates/review-events'
import { StoredEvent } from '../../domain/events/event-store'
import { PrismaTransaction } from '../prisma/client'
import { actorOf, projectorOf } from './projector'

/**
 * Keeps the confirmations and the flags in step with the review stream of
 * an entity, which bears the entity's id. A confirmation withdrawn or reset
 * leaves its table, a flag withdrawn too; a flag settled stays, closed.
 */
export const projectReview = projectorOf('review', decodeReviewEvent, apply)

async function apply(decoded: ReviewEvent, stored: StoredEvent, tx: PrismaTransaction) {
  const entityId = stored.streamId
  switch (decoded.type) {
    case 'Confirmed':
      // Idempotent: replaying the journal confirms nothing twice
      await tx.confirmations.createMany({
        data: [
          {
            entity_type: decoded.payload.entityType,
            entity_id: entityId,
            created_by: actorOf(stored, 'a confirmation'),
            created_at: stored.occurredAt,
          },
        ],
        skipDuplicates: true,
      })
      return
    case 'ConfirmationWithdrawn':
      await tx.confirmations.deleteMany({
        where: { entity_id: entityId, created_by: actorOf(stored, 'a withdrawal') },
      })
      return
    case 'Flagged':
      return raise(tx, stored, decoded.payload)
    case 'FlagWithdrawn':
      await tx.flags.deleteMany({ where: { id: decoded.payload.flagId } })
      return
    case 'FlagsSettled':
      await tx.flags.updateMany({
        where: { entity_id: entityId, status: 'open' },
        data: {
          status: decoded.payload.outcome,
          answer: decoded.payload.answer ?? null,
          updated_by: actorOf(stored, 'a settlement'),
          updated_at: stored.occurredAt,
        },
      })
      return
    case 'ConfirmationsReset':
      await tx.confirmations.deleteMany({ where: { entity_id: entityId } })
      return
  }
}

async function raise(tx: PrismaTransaction, stored: StoredEvent, flag: FlagPayload) {
  const reader = actorOf(stored, 'a flag')
  await tx.flags.createMany({
    data: [
      {
        id: flag.flagId,
        entity_type: flag.entityType,
        entity_id: stored.streamId,
        reason: flag.reason,
        comment: flag.comment,
        status: 'open',
        created_by: reader,
        updated_by: reader,
        created_at: stored.occurredAt,
        updated_at: stored.occurredAt,
      },
    ],
    skipDuplicates: true,
  })
}
