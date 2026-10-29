import { Context, Effect } from 'effect'
import { ContributorIdentity } from '../entities/contributor'
import { DatabaseError } from './errors'

export interface ContributorRepository {
  /** The contributor as the commands know her; null before her profile exists */
  findById(id: string): Effect.Effect<ContributorIdentity | null, DatabaseError>
  ensureExists(id: string): Effect.Effect<void, DatabaseError>
  existsByEmail(email: string): Effect.Effect<boolean, DatabaseError>
}

export const ContributorRepository =
  Context.GenericTag<ContributorRepository>('ContributorRepository')
