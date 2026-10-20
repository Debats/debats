import { Effect, pipe } from 'effect'
import { decodeThemeEvent, ThemeContent, ThemeEvent } from '../../domain/aggregates/theme-events'
import { StoredEvent } from '../../domain/events/event-store'
import { databaseError } from '../database/database-error'
import { PrismaTransaction } from '../prisma/client'
import type { Projector } from './projectors'

/**
 * Keeps the themes table in step with the theme stream. A deleted theme
 * leaves the table, and its links with it (the foreign key cascades).
 * Idempotent: replaying the journal rebuilds the table.
 */
export const projectTheme: Projector = (event, tx) =>
  pipe(
    decodeThemeEvent(event),
    Effect.mapError((unreadable) => databaseError('Unreadable theme event', unreadable)),
    Effect.flatMap((decoded) =>
      Effect.tryPromise({
        try: () => apply(decoded, event, tx),
        catch: (error) => databaseError('Failed to project the theme', error),
      }),
    ),
  )

async function apply(decoded: ThemeEvent, stored: StoredEvent, tx: PrismaTransaction) {
  switch (decoded.type) {
    case 'ThemeAdded':
    case 'ThemeImported':
      return createIfMissing(tx, stored, decoded.payload)
    case 'ThemeDeleted':
      await tx.themes.deleteMany({ where: { id: stored.streamId } })
      return
  }
}

/** An import finds its row already there; a replay from scratch creates it */
async function createIfMissing(tx: PrismaTransaction, stored: StoredEvent, payload: ThemeContent) {
  const found = await tx.themes.findUnique({ where: { id: stored.streamId }, select: { id: true } })
  if (found) return
  if (!stored.actorId) throw new Error('Cannot create a theme without an actor')
  await tx.themes.create({
    data: {
      id: stored.streamId,
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      created_by: stored.actorId,
      updated_by: stored.actorId,
      created_at: stored.occurredAt,
      updated_at: stored.occurredAt,
    },
  })
}
