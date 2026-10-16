import { Context, Effect } from 'effect'
import { Argument } from '../entities/argument'
import { DatabaseError } from './errors'

export interface ArgumentRepository {
  /** Every live argument of a subject, oldest first */
  findBySubjectId(subjectId: string): Effect.Effect<Argument[], DatabaseError>

  findByIds(ids: string[]): Effect.Effect<Argument[], DatabaseError>

  /** Identifiers of the arguments a statement mobilises */
  findIdsByStatementId(statementId: string): Effect.Effect<string[], DatabaseError>

  create(argument: Argument): Effect.Effect<Argument, DatabaseError>

  /** Replaces the set of arguments a statement mobilises */
  setStatementArguments(
    statementId: string,
    argumentIds: string[],
    createdBy: string,
  ): Effect.Effect<void, DatabaseError>
}

export const ArgumentRepository = Context.GenericTag<ArgumentRepository>('ArgumentRepository')
