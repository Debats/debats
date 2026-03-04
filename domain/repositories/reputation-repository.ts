import { Effect } from 'effect'
import { DatabaseError } from './errors'
import { ReputationEvent, RelatedEntityType } from '../entities/reputation-event'
import { RewardableAction } from '../reputation/permissions'

export interface ReputationRepository {
  getReputation(contributorId: string): Effect.Effect<number, DatabaseError>

  recordEvent(event: {
    contributorId: string
    action: RewardableAction
    amount: number
    relatedEntityType?: RelatedEntityType
    relatedEntityId?: string
  }): Effect.Effect<void, DatabaseError>

  getHistory(contributorId: string): Effect.Effect<ReputationEvent[], DatabaseError>
}
