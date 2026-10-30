import { decodeThemeEvent, ThemeContent, ThemeEvent } from '../../domain/aggregates/theme-events'
import { StoredEvent } from '../../domain/events/event-store'
import { PrismaTransaction } from '../prisma/client'
import { auditOf, projectorOf } from './projector'

/**
 * Keeps the themes table in step with the theme stream. A deleted theme
 * leaves the table, and its links with it (the foreign key cascades).
 */
export const projectTheme = projectorOf('theme', decodeThemeEvent, apply)

async function apply(decoded: ThemeEvent, stored: StoredEvent, tx: PrismaTransaction) {
  switch (decoded.type) {
    case 'ThemeAdded':
      return create(tx, stored, decoded.payload)
    case 'ThemeDeleted':
      await tx.themes.deleteMany({ where: { id: stored.streamId } })
      return
  }
}

async function create(tx: PrismaTransaction, stored: StoredEvent, payload: ThemeContent) {
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
