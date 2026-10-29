import { Context, Effect } from 'effect'
import { Subject } from '../entities/subject'
import { SubjectIndexEntry } from '../read-models/subject-index'
import { SubjectStats } from '../value-objects/subject-stats'
import { DatabaseError } from './errors'

/**
 * Read model for the homepage: subject with pre-aggregated stats and figures.
 */
export interface SubjectActivitySummary {
  id: string
  title: string
  slug: string
  presentation: string
  problem: string
  pictureUrl?: string
  createdAt: Date
  latestStatementAt: Date | null
  positionsCount: number
  statementsCount: number
  publicFiguresCount: number
  figures: Array<{ id: string; name: string; slug: string }>
}

export interface SubjectRepository {
  findAll(): Effect.Effect<Subject[], DatabaseError>

  /** Subjects whose title contains every word of the query, in any order */
  searchByTitle(query: string, limit?: number): Effect.Effect<Subject[], DatabaseError>

  findBySlug(slug: string): Effect.Effect<Subject | null, DatabaseError>

  findById(id: string): Effect.Effect<Subject | null, DatabaseError>

  /** Writes go through the journal (domain/aggregates/subject.ts); this repository only reads */
  getStats(subjectId: string): Effect.Effect<SubjectStats, DatabaseError>

  findSummariesByActivity(
    limit: number,
    excludeId?: string,
  ): Effect.Effect<SubjectActivitySummary[], DatabaseError>
  findSummariesByCreatedAt(limit: number): Effect.Effect<SubjectActivitySummary[], DatabaseError>
  findSummaryById(id: string): Effect.Effect<SubjectActivitySummary | null, DatabaseError>
  findSummariesByIds(ids: string[]): Effect.Effect<SubjectActivitySummary[], DatabaseError>
  /** Every live subject with its activity and primary theme: the subjects index */
  findIndexEntries(): Effect.Effect<SubjectIndexEntry[], DatabaseError>
  findAllIds(): Effect.Effect<string[], DatabaseError>
  findIdsWithoutPrimaryTheme(): Effect.Effect<string[], DatabaseError>
}

export const SubjectRepository = Context.GenericTag<SubjectRepository>('SubjectRepository')
