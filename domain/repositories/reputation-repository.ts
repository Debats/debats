import { Effect } from 'effect'
import { DatabaseError } from './subject-repository'

export interface ReputationRepository {
  getReputation(contributorId: string): Effect.Effect<number, DatabaseError>
  addReputation(contributorId: string, amount: number): Effect.Effect<void, DatabaseError>
}
