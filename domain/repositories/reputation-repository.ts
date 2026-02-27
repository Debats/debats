import { Effect } from 'effect'
import { DatabaseError } from './errors'

export interface ReputationRepository {
  getReputation(contributorId: string): Effect.Effect<number, DatabaseError>
  addReputation(contributorId: string, amount: number): Effect.Effect<void, DatabaseError>
}
