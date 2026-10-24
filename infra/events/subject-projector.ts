import {
  decodeSubjectEvent,
  PositionContent,
  SubjectContent,
  SubjectEvent,
  ThemeAssignmentPayload,
} from '../../domain/aggregates/subject-events'
import { StoredEvent } from '../../domain/events/event-store'
import { PrismaTransaction } from '../prisma/client'
import { projectorOf } from './projector'

/**
 * Keeps subjects, positions, subject_themes and related_subjects in step
 * with the subject stream. Idempotent: replaying the journal rebuilds them.
 */
export const projectSubject = projectorOf('subject', decodeSubjectEvent, apply)

async function apply(decoded: SubjectEvent, stored: StoredEvent, tx: PrismaTransaction) {
  const subjectId = stored.streamId
  switch (decoded.type) {
    case 'SubjectAdded':
    case 'SubjectImported':
      return createSubjectIfMissing(tx, stored, decoded.payload)
    case 'SubjectEdited':
      await tx.subjects.update({
        where: { id: subjectId },
        data: {
          title: decoded.payload.title,
          slug: decoded.payload.slug,
          presentation: decoded.payload.presentation,
          problem: decoded.payload.problem,
          updated_at: stored.occurredAt,
        },
      })
      return
    case 'SubjectThemesSet':
      return syncThemes(tx, subjectId, decoded.payload.themes, stored.actorId)
    case 'SubjectLinked':
      return linkIfMissing(tx, subjectId, decoded.payload.subjectId, stored.actorId)
    case 'SubjectUnlinked': {
      const [subject_id_1, subject_id_2] = orderPair(subjectId, decoded.payload.subjectId)
      await tx.related_subjects.deleteMany({ where: { subject_id_1, subject_id_2 } })
      return
    }
    case 'PositionAdded':
    case 'PositionImported':
      return createPositionIfMissing(tx, stored, decoded.payload)
    case 'PositionEdited':
      await tx.positions.update({
        where: { id: decoded.payload.positionId },
        data: {
          title: decoded.payload.title,
          slug: decoded.payload.slug,
          description: decoded.payload.description,
          updated_at: stored.occurredAt,
        },
      })
      return
    case 'PositionMergedInto':
      await tx.positions.update({
        where: { id: decoded.payload.sourceId },
        data: deletedOn(stored.occurredAt),
      })
      return
    case 'PositionRemoved':
      await tx.positions.update({
        where: { id: decoded.payload.positionId },
        data: deletedOn(stored.occurredAt),
      })
      return
    case 'SubjectDeleted':
      await tx.subjects.update({ where: { id: subjectId }, data: deletedOn(stored.occurredAt) })
      await tx.positions.updateMany({
        where: { subject_id: subjectId, deleted_at: null },
        data: deletedOn(stored.occurredAt),
      })
      return
  }
}

/** A soft delete is a change of the row: it moves updated_at too */
const deletedOn = (at: Date) => ({ deleted_at: at, updated_at: at })

/** An import finds its row already there; a replay from scratch creates it */
async function createSubjectIfMissing(
  tx: PrismaTransaction,
  stored: StoredEvent,
  payload: SubjectContent,
) {
  const found = await tx.subjects.findUnique({
    where: { id: stored.streamId },
    select: { id: true },
  })
  if (found) return
  await tx.subjects.create({
    data: {
      id: stored.streamId,
      title: payload.title,
      slug: payload.slug,
      presentation: payload.presentation,
      problem: payload.problem,
      picture_url: payload.pictureUrl ?? null,
      created_by: stored.actorId,
      created_at: stored.occurredAt,
      updated_at: stored.occurredAt,
    },
  })
}

async function createPositionIfMissing(
  tx: PrismaTransaction,
  stored: StoredEvent,
  payload: PositionContent,
) {
  const found = await tx.positions.findUnique({
    where: { id: payload.positionId },
    select: { id: true },
  })
  if (found) return
  await tx.positions.create({
    data: {
      id: payload.positionId,
      subject_id: stored.streamId,
      title: payload.title,
      slug: payload.slug,
      description: payload.description,
      created_by: stored.actorId,
      created_at: stored.occurredAt,
      updated_at: stored.occurredAt,
    },
  })
}

/** Brings the theme links to the wanted set, touching only what changes */
async function syncThemes(
  tx: PrismaTransaction,
  subjectId: string,
  wanted: readonly ThemeAssignmentPayload[],
  actorId: string | null,
) {
  const current = await tx.subject_themes.findMany({
    where: { subject_id: subjectId },
    select: { theme_id: true, is_primary: true },
  })
  const wantedById = new Map(wanted.map((t) => [t.themeId, t.isPrimary]))
  const currentIds = new Set(current.map((l) => l.theme_id))
  const extra = current.filter((link) => !wantedById.has(link.theme_id)).map((l) => l.theme_id)
  const flipped = current.filter(
    (link) => wantedById.has(link.theme_id) && wantedById.get(link.theme_id) !== link.is_primary,
  )
  const missing = wanted.filter((t) => !currentIds.has(t.themeId))

  if (extra.length > 0) {
    await tx.subject_themes.deleteMany({
      where: { subject_id: subjectId, theme_id: { in: extra } },
    })
  }
  await flipPrimary(tx, subjectId, flipped)
  await addThemes(tx, subjectId, missing, actorId)
}

/** The primary flag is unique per subject: the old primary is cleared before the new one is set */
async function flipPrimary(
  tx: PrismaTransaction,
  subjectId: string,
  flipped: Array<{ theme_id: string; is_primary: boolean }>,
) {
  const inOrder = [...flipped].sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
  for (const link of inOrder) {
    await tx.subject_themes.update({
      where: { subject_id_theme_id: { subject_id: subjectId, theme_id: link.theme_id } },
      data: { is_primary: !link.is_primary },
    })
  }
}

async function addThemes(
  tx: PrismaTransaction,
  subjectId: string,
  missing: readonly ThemeAssignmentPayload[],
  actorId: string | null,
) {
  if (missing.length === 0) return
  if (!actorId) throw new Error('Cannot assign themes without an actor')
  await tx.subject_themes.createMany({
    data: missing.map((t) => ({
      subject_id: subjectId,
      theme_id: t.themeId,
      is_primary: t.isPrimary,
      created_by: actorId,
    })),
  })
}

/** The pair is stored once, ordered; either subject's stream may record it first */
async function linkIfMissing(
  tx: PrismaTransaction,
  subjectId: string,
  otherId: string,
  actorId: string | null,
) {
  const [subject_id_1, subject_id_2] = orderPair(subjectId, otherId)
  const found = await tx.related_subjects.findUnique({
    where: { subject_id_1_subject_id_2: { subject_id_1, subject_id_2 } },
    select: { subject_id_1: true },
  })
  if (found) return
  if (!actorId) throw new Error('Cannot link subjects without an actor')
  await tx.related_subjects.create({ data: { subject_id_1, subject_id_2, created_by: actorId } })
}

const orderPair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a])
