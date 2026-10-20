import { Context, Effect } from 'effect'
import { Argument } from '../entities/argument'
import { ArgumentRef, ArgumentSuggestion, ArgumentSummary } from '../read-models/argument'
import { DatabaseError } from './errors'

/** Read side of the arguments: writes go through the event journal */
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
}

export const ArgumentRepository = Context.GenericTag<ArgumentRepository>('ArgumentRepository')
