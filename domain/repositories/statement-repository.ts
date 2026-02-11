import { Context, Effect } from 'effect'
import { Statement, Evidence, LatestStatement } from '../entities/statement'
import { Position } from '../entities/position'
import { Subject } from '../entities/subject'
import { PublicFigure } from '../entities/public-figure'

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
 * Statement with related position and public figure details
 */
export interface StatementWithFigure {
  statement: Statement
  position: Position
  publicFigure: PublicFigure
}

export interface StatementRepository {
  findById(id: string): Effect.Effect<Statement | null, DatabaseError>

  findByPublicFigureId(publicFigureId: string): Effect.Effect<Statement[], DatabaseError>

  findByPositionId(positionId: string): Effect.Effect<Statement[], DatabaseError>

  /**
   * Get all statements for a public figure with position and subject details
   */
  findByPublicFigureWithDetails(
    publicFigureId: string,
  ): Effect.Effect<StatementWithDetails[], DatabaseError>

  /**
   * Get all statements for a subject with position and public figure details
   */
  findBySubjectWithFigures(subjectId: string): Effect.Effect<StatementWithFigure[], DatabaseError>

  /**
   * Get the N most recent statements with summary data for the sidebar
   */
  findLatest(limit: number): Effect.Effect<LatestStatement[], DatabaseError>

  create(statement: Statement): Effect.Effect<Statement, DatabaseError>

  delete(id: string): Effect.Effect<void, DatabaseError>

  getEvidences(statementId: string): Effect.Effect<Evidence[], DatabaseError>
}

export const StatementRepository = Context.GenericTag<StatementRepository>('StatementRepository')
