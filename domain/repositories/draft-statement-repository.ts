import { Effect } from 'effect'
import { DraftStatement } from '../entities/draft-statement'
import { DatabaseError } from './errors'

export interface DraftStatementRepository {
  findByStatus(status: DraftStatement['status']): Effect.Effect<DraftStatement[], DatabaseError>
  findById(id: string): Effect.Effect<DraftStatement | null, DatabaseError>
  update(
    id: string,
    fields: Partial<Omit<DraftStatement, 'id' | 'createdAt' | 'updatedAt' | 'status'>>,
  ): Effect.Effect<DraftStatement, DatabaseError>
  updateStatus(
    id: string,
    status: 'validated' | 'rejected' | 'revision_requested',
    rejectionNote?: string,
  ): Effect.Effect<void, DatabaseError>
  deleteById(id: string): Effect.Effect<void, DatabaseError>
}
