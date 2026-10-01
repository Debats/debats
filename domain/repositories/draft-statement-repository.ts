import { Effect } from 'effect'
import { DraftStatement } from '../entities/draft-statement'
import { DatabaseError } from './errors'

export type SubjectDraftCount = { subjectTitle: string; count: number }

/** A draft to store: everything except what the database assigns itself. */
export type NewDraftStatement = Omit<
  DraftStatement,
  'id' | 'status' | 'rejectionNote' | 'createdAt' | 'updatedAt'
>

export interface DraftStatementRepository {
  /** Stores drafts in one round trip and returns their ids. */
  createMany(drafts: NewDraftStatement[]): Effect.Effect<string[], DatabaseError>
  findByStatus(status: DraftStatement['status']): Effect.Effect<DraftStatement[], DatabaseError>
  findPendingBySubject(subjectTitle: string): Effect.Effect<DraftStatement[], DatabaseError>
  countPendingBySubject(): Effect.Effect<SubjectDraftCount[], DatabaseError>
  findById(id: string): Effect.Effect<DraftStatement | null, DatabaseError>
  update(
    id: string,
    fields: Partial<Omit<DraftStatement, 'id' | 'createdAt' | 'updatedAt' | 'status'>>,
  ): Effect.Effect<DraftStatement | null, DatabaseError>
  updateStatus(
    id: string,
    status: 'validated' | 'rejected' | 'revision_requested',
    rejectionNote?: string,
  ): Effect.Effect<void, DatabaseError>
  deleteById(id: string): Effect.Effect<void, DatabaseError>
}
