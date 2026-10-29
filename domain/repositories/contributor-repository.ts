import { Context, Effect } from 'effect'
import { DatabaseError } from './errors'

export interface ContributorRepository {
  ensureExists(id: string): Effect.Effect<void, DatabaseError>
  existsByEmail(email: string): Effect.Effect<boolean, DatabaseError>
}

export const ContributorRepository =
  Context.GenericTag<ContributorRepository>('ContributorRepository')
