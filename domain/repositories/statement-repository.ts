import { Context, Effect } from 'effect'
import { Statement } from '../entities/statement'
import { LatestStatement } from '../read-models/latest-statement'
import { Position } from '../entities/position'
import { Subject } from '../entities/subject'
import { StatementAuthorRef } from '../read-models/statement-author'

export class DatabaseError extends Error {
  readonly _tag = 'DatabaseError'
}

/**
 * Statement with related position and subject details
 */
export interface StatementWithDetails {
  statement: Statement
  position: Position
  subject: Subject
}

/**
 * Statement with its position and who took it (public figure or organisation)
 */
export interface StatementWithAuthor {
  statement: Statement
  position: Position
  author: StatementAuthorRef
}

export interface StatementRepository {
  findById(id: string): Effect.Effect<Statement | null, DatabaseError>

  findByPublicFigureId(publicFigureId: string): Effect.Effect<Statement[], DatabaseError>

  findByPositionId(positionId: string): Effect.Effect<Statement[], DatabaseError>

  findByPositionIdWithAuthors(
    positionId: string,
  ): Effect.Effect<StatementWithAuthor[], DatabaseError>

  /**
   * Get all statements for a public figure with position and subject details
   */
  findByPublicFigureWithDetails(
    publicFigureId: string,
  ): Effect.Effect<StatementWithDetails[], DatabaseError>

  /**
   * Get all statements of an organisation with position and subject details
   */
  findByOrganisationWithDetails(
    organisationId: string,
  ): Effect.Effect<StatementWithDetails[], DatabaseError>

  /**
   * Get all statements for a public figure on a specific subject
   */
  findByPublicFigureAndSubject(
    publicFigureId: string,
    subjectId: string,
  ): Effect.Effect<StatementWithDetails[], DatabaseError>

  /**
   * Get all statements of an organisation on a specific subject
   */
  findByOrganisationAndSubject(
    organisationId: string,
    subjectId: string,
  ): Effect.Effect<StatementWithDetails[], DatabaseError>

  /**
   * Get all statements for a subject with their position and author
   */
  findBySubjectWithAuthors(subjectId: string): Effect.Effect<StatementWithAuthor[], DatabaseError>

  /**
   * Get the N most recent statements by date
   */
  findLatest(limit: number, subjectId?: string): Effect.Effect<LatestStatement[], DatabaseError>

  /**
   * Get the N most recently reported statements by created_at date
   */
  findLatestReported(limit: number): Effect.Effect<LatestStatement[], DatabaseError>

  create(statement: Statement): Effect.Effect<Statement, DatabaseError>

  update(statement: Statement): Effect.Effect<Statement, DatabaseError>

  delete(id: string): Effect.Effect<void, DatabaseError>
}

export const StatementRepository = Context.GenericTag<StatementRepository>('StatementRepository')
