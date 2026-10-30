import {
  decodeOrganisationEvent,
  OrganisationContent,
  OrganisationEvent,
} from '../../domain/aggregates/organisation-events'
import { StoredEvent } from '../../domain/events/event-store'
import { PrismaTransaction } from '../prisma/client'
import { auditOf, changedBy, projectorOf } from './projector'

/**
 * Keeps the organisations table in step with the organisation stream.
 * Idempotent: replaying the journal rebuilds it.
 */
export const projectOrganisation = projectorOf('organisation', decodeOrganisationEvent, apply)

async function apply(decoded: OrganisationEvent, stored: StoredEvent, tx: PrismaTransaction) {
  const organisationId = stored.streamId
  switch (decoded.type) {
    case 'OrganisationAdded':
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
  await tx.organisations.create({
    data: { id: stored.streamId, ...columns(payload), ...auditOf(stored, 'an organisation') },
  })
}
