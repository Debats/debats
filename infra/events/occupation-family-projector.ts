import { Effect, pipe } from 'effect'
import {
  decodeOccupationFamilyEvent,
  FamilyContent,
  OccupationContent,
  OccupationFamilyEvent,
} from '../../domain/aggregates/occupation-family-events'
import { StoredEvent } from '../../domain/events/event-store'
import { databaseError } from '../database/database-error'
import { PrismaTransaction } from '../prisma/client'
import type { Projector } from './projectors'

/**
 * Keeps the families and occupations tables in step with the family stream.
 * A removed occupation or a deleted family leaves its table, and the links
 * with it (the foreign keys cascade). Idempotent: replaying the journal
 * rebuilds both tables.
 */
export const projectOccupationFamily: Projector = (event, tx) =>
  pipe(
    decodeOccupationFamilyEvent(event),
    Effect.mapError((unreadable) =>
      databaseError('Unreadable occupation family event', unreadable),
    ),
    Effect.flatMap((decoded) =>
      Effect.tryPromise({
        try: () => apply(decoded, event, tx),
        catch: (error) => databaseError('Failed to project the occupation family', error),
      }),
    ),
  )

async function apply(decoded: OccupationFamilyEvent, stored: StoredEvent, tx: PrismaTransaction) {
  switch (decoded.type) {
    case 'OccupationFamilyAdded':
    case 'OccupationFamilyImported':
      return createFamilyIfMissing(tx, stored, decoded.payload)
    case 'OccupationAdded':
    case 'OccupationImported':
      return createOccupationIfMissing(tx, stored, decoded.payload)
    case 'OccupationRemoved':
      await tx.occupations.deleteMany({
        where: { id: decoded.payload.occupationId, family_id: stored.streamId },
      })
      return
    case 'OccupationFamilyDeleted':
      await tx.occupation_families.deleteMany({ where: { id: stored.streamId } })
      return
  }
}

/** An import finds its row already there; a replay from scratch creates it */
async function createFamilyIfMissing(
  tx: PrismaTransaction,
  stored: StoredEvent,
  payload: FamilyContent,
) {
  const found = await tx.occupation_families.findUnique({
    where: { id: stored.streamId },
    select: { id: true },
  })
  if (found) return
  await tx.occupation_families.create({
    data: {
      id: stored.streamId,
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      position: payload.position,
      ...audit(stored),
    },
  })
}

async function createOccupationIfMissing(
  tx: PrismaTransaction,
  stored: StoredEvent,
  payload: OccupationContent,
) {
  const found = await tx.occupations.findUnique({
    where: { id: payload.occupationId },
    select: { id: true },
  })
  if (found) return
  await tx.occupations.create({
    data: {
      id: payload.occupationId,
      family_id: stored.streamId,
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      ...audit(stored),
    },
  })
}

function audit(stored: StoredEvent) {
  if (!stored.actorId) throw new Error('Cannot create a family or an occupation without an actor')
  return {
    created_by: stored.actorId,
    updated_by: stored.actorId,
    created_at: stored.occurredAt,
    updated_at: stored.occurredAt,
  }
}
