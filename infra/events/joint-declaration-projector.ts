import {
  decodeJointDeclarationEvent,
  JointDeclarationContent,
  JointDeclarationEvent,
  TakenPositionPayload,
} from '../../domain/aggregates/joint-declaration-events'
import { StatementAuthor } from '../../domain/entities/statement'
import { StoredEvent } from '../../domain/events/event-store'
import { PrismaTransaction } from '../prisma/client'
import { actorOf, auditOf, changedBy, projectorOf } from './projector'

/**
 * Keeps the joint_declarations, joint_declaration_positions and
 * joint_declaration_signatories tables in step with the joint declaration
 * stream. The statements a signature makes are the statement projector's.
 */
export const projectJointDeclaration = projectorOf(
  'joint declaration',
  decodeJointDeclarationEvent,
  apply,
)

async function apply(decoded: JointDeclarationEvent, stored: StoredEvent, tx: PrismaTransaction) {
  switch (decoded.type) {
    case 'JointDeclarationPublished':
      return create(tx, stored, decoded.payload)
    case 'PositionTaken':
      await takePosition(tx, stored, decoded.payload)
      return touch(tx, stored)
    case 'SignatoryAdded':
      await addSignatory(tx, stored, decoded.payload.author)
      return touch(tx, stored)
    case 'TakenPositionMerged':
      await tx.joint_declaration_positions.updateMany({
        where: { joint_declaration_id: stored.streamId, position_id: decoded.payload.sourceId },
        data: { position_id: decoded.payload.targetId },
      })
      return touch(tx, stored)
    case 'SubjectDisengaged':
      await tx.joint_declaration_positions.deleteMany({
        where: { joint_declaration_id: stored.streamId, subject_id: decoded.payload.subjectId },
      })
      return touch(tx, stored)
  }
}

async function create(
  tx: PrismaTransaction,
  stored: StoredEvent,
  payload: JointDeclarationContent,
) {
  await tx.joint_declarations.create({
    data: {
      id: stored.streamId,
      title: payload.title,
      slug: payload.slug,
      presentation: payload.presentation ?? null,
      source_name: payload.sourceName,
      source_url: payload.sourceUrl,
      declared_at: new Date(payload.declaredAt),
      ...auditOf(stored, 'a joint declaration'),
    },
  })
}

async function takePosition(
  tx: PrismaTransaction,
  stored: StoredEvent,
  payload: TakenPositionPayload,
) {
  const held = await tx.joint_declaration_positions.count({
    where: { joint_declaration_id: stored.streamId },
  })
  await tx.joint_declaration_positions.create({
    data: {
      joint_declaration_id: stored.streamId,
      subject_id: payload.subjectId,
      position_id: payload.positionId,
      quote: payload.quote,
      rank: held + 1,
      created_by: actorOf(stored, 'a position of a joint declaration'),
      created_at: stored.occurredAt,
    },
  })
}

async function addSignatory(tx: PrismaTransaction, stored: StoredEvent, author: StatementAuthor) {
  const signed = await tx.joint_declaration_signatories.count({
    where: { joint_declaration_id: stored.streamId },
  })
  await tx.joint_declaration_signatories.create({
    data: {
      joint_declaration_id: stored.streamId,
      public_figure_id: author.kind === 'public_figure' ? author.id : null,
      organisation_id: author.kind === 'organisation' ? author.id : null,
      rank: signed + 1,
      created_by: actorOf(stored, 'a signatory of a joint declaration'),
      created_at: stored.occurredAt,
    },
  })
}

/** A position taken or a signature added changes the text's row: it is signed and dated as the event */
async function touch(tx: PrismaTransaction, stored: StoredEvent) {
  await tx.joint_declarations.update({ where: { id: stored.streamId }, data: changedBy(stored) })
}
