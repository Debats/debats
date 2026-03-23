import { Effect } from 'effect'
import { DraftStatement } from '../entities/draft-statement'
import { DatabaseError } from './errors'

export interface DraftStatementRepository {
  findAllPending(): Effect.Effect<DraftStatement[], DatabaseError>
  findAllRejected(): Effect.Effect<DraftStatement[], DatabaseError>
  findById(id: string): Effect.Effect<DraftStatement | null, DatabaseError>
  update(
    id: string,
    fields: Partial<Omit<DraftStatement, 'id' | 'createdAt' | 'updatedAt' | 'status'>>,
  ): Effect.Effect<DraftStatement, DatabaseError>
  updateStatus(
    id: string,
    status: 'validated' | 'rejected',
    rejectionNote?: string,
  ): Effect.Effect<void, DatabaseError>
}
