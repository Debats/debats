import { Context, Effect } from 'effect'
import { DraftStatement } from '../entities/draft-statement'
import { DraftGroup, DraftGrouping } from '../read-models/drafts-view'
import { DatabaseError } from './errors'

/** A draft to store: everything except what the database assigns itself. */
export type NewDraftStatement = Omit<
  DraftStatement,
  'id' | 'status' | 'rejectionNote' | 'createdAt' | 'updatedAt'
>

export interface DraftStatementRepository {
  /** Stores drafts in one round trip and returns their ids. */
  createMany(drafts: NewDraftStatement[]): Effect.Effect<string[], DatabaseError>
  findByStatus(status: DraftStatement['status']): Effect.Effect<DraftStatement[], DatabaseError>
  /** The pending drafts of one group, the newest first */
  findPendingInGroup(
    grouping: DraftGrouping,
    label: string,
  ): Effect.Effect<DraftStatement[], DatabaseError>
  /** Every group of pending drafts under this grouping, the fullest first */
  countPendingGroups(grouping: DraftGrouping): Effect.Effect<DraftGroup[], DatabaseError>
  findById(id: string): Effect.Effect<DraftStatement | null, DatabaseError>
  /** Every draft a chantier produced, whatever became of it, the newest first */
  findByChantier(chantierId: string): Effect.Effect<DraftStatement[], DatabaseError>
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

export const DraftStatementRepository = Context.GenericTag<DraftStatementRepository>(
  'DraftStatementRepository',
)
