import { Context, Effect } from 'effect'
import { Argument } from '../entities/argument'
import { ArgumentRef, ArgumentSuggestion, ArgumentSummary } from '../read-models/argument'
import { DatabaseError } from './errors'

export interface ArgumentRepository {
  findById(id: string): Effect.Effect<Argument | null, DatabaseError>

  findBySlug(slug: string): Effect.Effect<Argument | null, DatabaseError>

  findByIds(ids: string[]): Effect.Effect<Argument[], DatabaseError>

  /** The argument bearing this title, whatever its case */
  findByTitle(title: string): Effect.Effect<Argument | null, DatabaseError>

  /** Arguments whose title contains the query, most used first */
  search(query: string, limit?: number): Effect.Effect<ArgumentSuggestion[], DatabaseError>

  /** Every live argument with its usage, most used first */
  findSummaries(): Effect.Effect<ArgumentSummary[], DatabaseError>

  /** The arguments a statement mobilises, by title */
  findRefsByStatementId(statementId: string): Effect.Effect<ArgumentRef[], DatabaseError>

  create(argument: Argument): Effect.Effect<Argument, DatabaseError>

  update(argument: Argument): Effect.Effect<Argument, DatabaseError>

  /** Replaces the set of arguments a statement mobilises */
  setStatementArguments(
    statementId: string,
    argumentIds: string[],
    createdBy: string,
  ): Effect.Effect<void, DatabaseError>

  /** The source's statements now mobilise the target; the source disappears */
  mergeInto(sourceId: string, targetId: string): Effect.Effect<void, DatabaseError>

  delete(id: string): Effect.Effect<void, DatabaseError>
}

export const ArgumentRepository = Context.GenericTag<ArgumentRepository>('ArgumentRepository')
