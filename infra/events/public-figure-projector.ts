import { Effect, pipe } from 'effect'
import {
  decodePublicFigureEvent,
  MembershipContent,
  OccupationAssignmentPayload,
  PublicFigureContent,
  PublicFigureEvent,
} from '../../domain/aggregates/public-figure-events'
import { StoredEvent } from '../../domain/events/event-store'
import { databaseError } from '../database/database-error'
import { PrismaTransaction } from '../prisma/client'
import type { Projector } from './projectors'

/**
 * Keeps public_figures, public_figure_occupations and organisation_memberships
 * in step with the public figure stream. Idempotent: replaying the journal
 * rebuilds them.
 */
export const projectPublicFigure: Projector = (event, tx) =>
  pipe(
    decodePublicFigureEvent(event),
    Effect.mapError((unreadable) => databaseError('Unreadable public figure event', unreadable)),
    Effect.flatMap((decoded) =>
      Effect.tryPromise({
        try: () => apply(decoded, event, tx),
        catch: (error) => databaseError('Failed to project the public figure', error),
      }),
    ),
  )

async function apply(decoded: PublicFigureEvent, stored: StoredEvent, tx: PrismaTransaction) {
  const figureId = stored.streamId
  switch (decoded.type) {
    case 'PublicFigureAdded':
    case 'PublicFigureImported':
      return createFigureIfMissing(tx, stored, decoded.payload)
    case 'PublicFigureEdited':
      await tx.public_figures.update({
        where: { id: figureId },
        data: { ...figureColumns(decoded.payload), updated_at: stored.occurredAt },
      })
      return
    case 'OccupationsSet':
      return syncOccupations(tx, figureId, decoded.payload.occupations, stored.actorId)
    case 'MembershipAdded':
    case 'MembershipImported':
      return createMembershipIfMissing(tx, stored, decoded.payload)
    case 'MembershipRemoved':
      await tx.organisation_memberships.deleteMany({ where: { id: decoded.payload.membershipId } })
      return
    case 'PublicFigureDeleted':
      await tx.public_figures.update({
        where: { id: figureId },
        data: { deleted_at: stored.occurredAt, updated_at: stored.occurredAt },
      })
      return
  }
}

function figureColumns(content: PublicFigureContent) {
  return {
    name: content.name,
    slug: content.slug,
    presentation: content.presentation,
    wikipedia_url: content.wikipediaUrl ?? null,
    website_url: content.websiteUrl ?? null,
    notoriety_sources: [...content.notorietySources],
  }
}

/** An import finds its row already there; a replay from scratch creates it */
async function createFigureIfMissing(
  tx: PrismaTransaction,
  stored: StoredEvent,
  payload: PublicFigureContent,
) {
  const found = await tx.public_figures.findUnique({
    where: { id: stored.streamId },
    select: { id: true },
  })
  if (found) return
  if (!stored.actorId) throw new Error('Cannot create a public figure without an actor')
  await tx.public_figures.create({
    data: {
      id: stored.streamId,
      ...figureColumns(payload),
      created_by: stored.actorId,
      created_at: stored.occurredAt,
      updated_at: stored.occurredAt,
    },
  })
}

async function createMembershipIfMissing(
  tx: PrismaTransaction,
  stored: StoredEvent,
  payload: MembershipContent,
) {
  const found = await tx.organisation_memberships.findUnique({
    where: { id: payload.membershipId },
    select: { id: true },
  })
  if (found) return
  if (!stored.actorId) throw new Error('Cannot create a membership without an actor')
  await tx.organisation_memberships.create({
    data: {
      id: payload.membershipId,
      public_figure_id: stored.streamId,
      organisation_id: payload.organisationId,
      role: payload.role ?? null,
      started_on: payload.startedOn ? new Date(payload.startedOn) : null,
      ended_on: payload.endedOn ? new Date(payload.endedOn) : null,
      created_by: stored.actorId,
      updated_by: stored.actorId,
      created_at: stored.occurredAt,
      updated_at: stored.occurredAt,
    },
  })
}

/** Brings the occupation links to the wanted set, touching only what changes */
async function syncOccupations(
  tx: PrismaTransaction,
  figureId: string,
  wanted: readonly OccupationAssignmentPayload[],
  actorId: string | null,
) {
  const current = await tx.public_figure_occupations.findMany({
    where: { public_figure_id: figureId },
    select: { occupation_id: true, is_current: true },
  })
  const wantedById = new Map(wanted.map((o) => [o.occupationId, o.current]))
  const currentIds = new Set(current.map((l) => l.occupation_id))
  const extra = current.filter((l) => !wantedById.has(l.occupation_id)).map((l) => l.occupation_id)
  const flipped = current.filter(
    (l) => wantedById.has(l.occupation_id) && wantedById.get(l.occupation_id) !== l.is_current,
  )
  const missing = wanted.filter((o) => !currentIds.has(o.occupationId))

  if (extra.length > 0) {
    await tx.public_figure_occupations.deleteMany({
      where: { public_figure_id: figureId, occupation_id: { in: extra } },
    })
  }
  await flipCurrent(tx, figureId, flipped)
  await addOccupations(tx, figureId, missing, actorId)
}

async function flipCurrent(
  tx: PrismaTransaction,
  figureId: string,
  flipped: Array<{ occupation_id: string; is_current: boolean }>,
) {
  for (const link of flipped) {
    await tx.public_figure_occupations.update({
      where: {
        public_figure_id_occupation_id: {
          public_figure_id: figureId,
          occupation_id: link.occupation_id,
        },
      },
      data: { is_current: !link.is_current },
    })
  }
}

async function addOccupations(
  tx: PrismaTransaction,
  figureId: string,
  missing: readonly OccupationAssignmentPayload[],
  actorId: string | null,
) {
  if (missing.length === 0) return
  if (!actorId) throw new Error('Cannot assign occupations without an actor')
  await tx.public_figure_occupations.createMany({
    data: missing.map((o) => ({
      public_figure_id: figureId,
      occupation_id: o.occupationId,
      is_current: o.current,
      created_by: actorId,
    })),
  })
}
