import { Effect, pipe } from 'effect'
import {
  ContributorEvent,
  decodeContributorEvent,
  GrantPayload,
} from '../../domain/aggregates/contributor-events'
import { StoredEvent } from '../../domain/events/event-store'
import { databaseError } from '../database/database-error'
import { PrismaTransaction } from '../prisma/client'
import type { Projector } from './projectors'

/**
 * Keeps the reputation history in step with the contributor stream. The
 * contributors.reputation cache follows through the table's own trigger
 * (`trg_sync_reputation`), in the same transaction. Idempotent: a grant
 * already in the table is left alone.
 */
export const projectContributor: Projector = (event, tx) =>
  pipe(
    decodeContributorEvent(event),
    Effect.mapError((unreadable) => databaseError('Unreadable contributor event', unreadable)),
    Effect.flatMap((decoded) =>
      Effect.tryPromise({
        try: () => apply(decoded, event, tx),
        catch: (error) => databaseError('Failed to project the contributor', error),
      }),
    ),
  )

async function apply(decoded: ContributorEvent, stored: StoredEvent, tx: PrismaTransaction) {
  switch (decoded.type) {
    case 'ReputationGranted':
      return createGrantIfMissing(tx, stored, decoded.payload)
  }
}

async function createGrantIfMissing(
  tx: PrismaTransaction,
  stored: StoredEvent,
  payload: GrantPayload,
) {
  const found = await tx.reputation_events.findUnique({
    where: { id: payload.grantId },
    select: { id: true },
  })
  if (found) return
  await tx.reputation_events.create({
    data: {
      id: payload.grantId,
      contributor_id: stored.streamId,
      action: payload.action,
      amount: payload.amount,
      related_entity_type: payload.relatedEntityType ?? null,
      related_entity_id: payload.relatedEntityId ?? null,
      created_at: stored.occurredAt,
    },
  })
}
