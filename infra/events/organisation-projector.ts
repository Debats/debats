import { Effect, pipe } from 'effect'
import {
  decodeOrganisationEvent,
  OrganisationContent,
  OrganisationEvent,
} from '../../domain/aggregates/organisation-events'
import { StoredEvent } from '../../domain/events/event-store'
import { databaseError } from '../database/database-error'
import { PrismaTransaction } from '../prisma/client'
import type { Projector } from './projectors'

/**
 * Keeps the organisations table in step with the organisation stream.
 * Idempotent: replaying the journal rebuilds it.
 */
export const projectOrganisation: Projector = (event, tx) =>
  pipe(
    decodeOrganisationEvent(event),
    Effect.mapError((unreadable) => databaseError('Unreadable organisation event', unreadable)),
    Effect.flatMap((decoded) =>
      Effect.tryPromise({
        try: () => apply(decoded, event, tx),
        catch: (error) => databaseError('Failed to project the organisation', error),
      }),
    ),
  )

async function apply(decoded: OrganisationEvent, stored: StoredEvent, tx: PrismaTransaction) {
  const organisationId = stored.streamId
  switch (decoded.type) {
    case 'OrganisationAdded':
    case 'OrganisationImported':
      return createIfMissing(tx, stored, decoded.payload)
    case 'OrganisationEdited':
      await tx.organisations.update({
        where: { id: organisationId },
        data: { ...columns(decoded.payload), ...changedBy(stored) },
      })
      return
    case 'OrganisationDeleted':
      await tx.organisations.update({
        where: { id: organisationId },
        data: { deleted_at: stored.occurredAt, ...changedBy(stored) },
      })
      return
  }
}

/** Who changed the row and when, as the event says */
const changedBy = (stored: StoredEvent) => ({
  ...(stored.actorId ? { updated_by: stored.actorId } : {}),
  updated_at: stored.occurredAt,
})

function columns(content: OrganisationContent) {
  return {
    name: content.name,
    slug: content.slug,
    acronym: content.acronym ?? null,
    organisation_type: content.organisationType,
    presentation: content.presentation,
    wikipedia_url: content.wikipediaUrl ?? null,
    website_url: content.websiteUrl ?? null,
    notoriety_sources: [...content.notorietySources],
  }
}

/** An import finds its row already there; a replay from scratch creates it */
async function createIfMissing(
  tx: PrismaTransaction,
  stored: StoredEvent,
  payload: OrganisationContent,
) {
  const found = await tx.organisations.findUnique({
    where: { id: stored.streamId },
    select: { id: true },
  })
  if (found) return
  if (!stored.actorId) throw new Error('Cannot create an organisation without an actor')
  await tx.organisations.create({
    data: {
      id: stored.streamId,
      ...columns(payload),
      created_by: stored.actorId,
      updated_by: stored.actorId,
      created_at: stored.occurredAt,
      updated_at: stored.occurredAt,
    },
  })
}
