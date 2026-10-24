import { decodeThemeEvent, ThemeContent, ThemeEvent } from '../../domain/aggregates/theme-events'
import { StoredEvent } from '../../domain/events/event-store'
import { PrismaTransaction } from '../prisma/client'
import { auditOf, projectorOf } from './projector'

/**
 * Keeps the themes table in step with the theme stream. A deleted theme
 * leaves the table, and its links with it (the foreign key cascades).
 * Idempotent: replaying the journal rebuilds the table.
 */
export const projectTheme = projectorOf('theme', decodeThemeEvent, apply)

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
  await tx.themes.create({
    data: {
      id: stored.streamId,
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      ...auditOf(stored, 'a theme'),
    },
  })
}
