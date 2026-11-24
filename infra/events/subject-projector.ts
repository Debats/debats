import {
  decodeSubjectEvent,
  PositionContent,
  SubjectContent,
  SubjectEvent,
  ThemeAssignmentPayload,
} from '../../domain/aggregates/subject-events'
import { StoredEvent } from '../../domain/events/event-store'
import { PrismaTransaction } from '../prisma/client'
import { leadDraftsToSubject } from './drafts-of-merged-subject'
import { auditOf, changedBy, projectorOf } from './projector'

/**
 * Keeps subjects, positions, subject_themes and related_subjects in step
 * with the subject stream.
 */
export const projectSubject = projectorOf('subject', decodeSubjectEvent, apply)

async function apply(decoded: SubjectEvent, stored: StoredEvent, tx: PrismaTransaction) {
  const subjectId = stored.streamId
  switch (decoded.type) {
    case 'SubjectAdded':
      return createSubject(tx, stored, decoded.payload)
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
      return createPosition(tx, stored, decoded.payload)
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
      return closePositions(tx, [decoded.payload.sourceId], stored.occurredAt)
    case 'PositionRemoved':
      return closePositions(tx, [decoded.payload.positionId], stored.occurredAt)
    case 'PositionsJudged':
      return judgePair(tx, stored, decoded.payload)
    case 'SubjectDeleted': {
      await tx.subjects.update({ where: { id: subjectId }, data: deletedOn(stored.occurredAt) })
      const open = await tx.positions.findMany({
        where: { subject_id: subjectId, deleted_at: null },
        select: { id: true },
      })
      return closePositions(
        tx,
        open.map((p) => p.id),
        stored.occurredAt,
      )
    }
    case 'SubjectMergedInto':
      return mergeAway(tx, stored, decoded.payload)
    case 'SubjectAbsorbed':
      // The positions carried over keep their id, so the statements on them follow
      await tx.positions.updateMany({
        where: { id: { in: decoded.payload.positions.map((p) => p.positionId) } },
        data: { subject_id: subjectId, updated_at: stored.occurredAt },
      })
      return
  }
}

/**
 * The subject is gone, and says where: its old address redirects there. The
 * positions folded go with it; those carried over are moved by the subject
 * that took them, whichever of the two events comes first. No link is left
 * to a subject nobody can open, and the drafts that named it name the subject
 * that remains.
 */
async function mergeAway(
  tx: PrismaTransaction,
  stored: StoredEvent,
  payload: Extract<SubjectEvent, { type: 'SubjectMergedInto' }>['payload'],
) {
  const subjectId = stored.streamId
  await tx.subjects.update({
    where: { id: subjectId },
    data: { ...deletedOn(stored.occurredAt), merged_into_id: payload.targetId },
  })
  await closePositions(
    tx,
    payload.positions.filter((p) => p.into).map((p) => p.positionId),
    stored.occurredAt,
  )
  await tx.related_subjects.deleteMany({
    where: { OR: [{ subject_id_1: subjectId }, { subject_id_2: subjectId }] },
  })
  await leadDraftsToSubject(tx, subjectId, payload.targetId, payload.positions)
}

/** A soft delete is a change of the row: it moves updated_at too */
const deletedOn = (at: Date) => ({ deleted_at: at, updated_at: at })

/** Positions that are gone take with them what was judged of them */
async function closePositions(tx: PrismaTransaction, positionIds: string[], at: Date) {
  if (positionIds.length === 0) return
  await tx.positions.updateMany({ where: { id: { in: positionIds } }, data: deletedOn(at) })
  await tx.position_judgements.deleteMany({
    where: { OR: [{ position_id_1: { in: positionIds } }, { position_id_2: { in: positionIds } }] },
  })
}

/** The last verdict on a pair stands; the event names the pair the smaller id first, as the table does */
async function judgePair(
  tx: PrismaTransaction,
  stored: StoredEvent,
  payload: Extract<SubjectEvent, { type: 'PositionsJudged' }>['payload'],
) {
  const [position_id_1, position_id_2] = payload.positionIds
  await tx.position_judgements.upsert({
    where: { position_id_1_position_id_2: { position_id_1, position_id_2 } },
    create: {
      position_id_1,
      position_id_2,
      compatible: payload.compatible,
      ...auditOf(stored, 'a position judgement'),
    },
    update: { compatible: payload.compatible, ...changedBy(stored) },
  })
}

async function createSubject(tx: PrismaTransaction, stored: StoredEvent, payload: SubjectContent) {
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

async function createPosition(
  tx: PrismaTransaction,
  stored: StoredEvent,
  payload: PositionContent,
) {
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
