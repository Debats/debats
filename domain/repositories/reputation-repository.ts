import { Effect } from 'effect'
import { DatabaseError } from './errors'
import { ReputationEvent } from '../entities/reputation-event'

/** Read side of the reputation: grants go through the contributor stream (domain/use-cases/reward.ts) */
export interface ReputationRepository {
  getReputation(contributorId: string): Effect.Effect<number, DatabaseError>

  getHistory(contributorId: string): Effect.Effect<ReputationEvent[], DatabaseError>
}
