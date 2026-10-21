import { Context, Effect } from 'effect'
import { Statement } from '../entities/statement'
import { LatestStatement } from '../read-models/latest-statement'
import { Position } from '../entities/position'
import { Subject } from '../entities/subject'
import { StatementAuthorRef } from '../read-models/statement-author'
import { ArgumentRef } from '../read-models/argument'

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
  /** The arguments the statement mobilises, by title */
  arguments: ArgumentRef[]
}

/**
 * Statement with its position and who took it (public figure or organisation)
 */
export interface StatementWithAuthor {
  statement: Statement
  position: Position
  author: StatementAuthorRef
  arguments: ArgumentRef[]
}

/** The first and last days an opinion was stated on a subject */
export interface StatedSpan {
  from: Date
  to: Date
}

/** Everything an argument's page needs about one statement that mobilises it */
export interface StatementWithAuthorAndSubject extends StatementWithAuthor {
  subject: Subject
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
   * Get every statement mobilising an argument, with position, subject and author
   */
  findByArgumentWithAuthors(
    argumentId: string,
  ): Effect.Effect<StatementWithAuthorAndSubject[], DatabaseError>

  /**
   * Get all statements for a subject with their position and author
   */
  findBySubjectWithAuthors(subjectId: string): Effect.Effect<StatementWithAuthor[], DatabaseError>

  /** The ids of the live statements on any position of a subject */
  findIdsBySubjectId(subjectId: string): Effect.Effect<string[], DatabaseError>

  /** The first and last days an opinion was stated on a subject; null without any */
  findStatedSpanBySubjectId(subjectId: string): Effect.Effect<StatedSpan | null, DatabaseError>

  /** The ids of the live statements mobilising an argument */
  findIdsByArgumentId(argumentId: string): Effect.Effect<string[], DatabaseError>

  /**
   * Get the N most recent statements by date
   */
  findLatest(limit: number, subjectId?: string): Effect.Effect<LatestStatement[], DatabaseError>

  /**
   * Get the N most recently reported statements by created_at date
   */
  findLatestReported(limit: number): Effect.Effect<LatestStatement[], DatabaseError>

  /**
   * Writes go through the journal (domain/aggregates/statement.ts); this
   * repository only reads the projection. Deletion has no command yet.
   */
  delete(id: string): Effect.Effect<void, DatabaseError>
}

export const StatementRepository = Context.GenericTag<StatementRepository>('StatementRepository')
