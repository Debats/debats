import { Effect } from 'effect'
import { Subject } from '../entities/subject'
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

  findBySlug(slug: string): Effect.Effect<Subject | null, DatabaseError>

  findById(id: string): Effect.Effect<Subject | null, DatabaseError>

  create(subject: Subject): Effect.Effect<Subject, DatabaseError>

  update(subject: Subject): Effect.Effect<Subject, DatabaseError>

  delete(id: string): Effect.Effect<void, DatabaseError>

  getStats(subjectId: string): Effect.Effect<SubjectStats, DatabaseError>

  findSummariesByActivity(
    limit: number,
    excludeId?: string,
  ): Effect.Effect<SubjectActivitySummary[], DatabaseError>
  findSummariesByCreatedAt(limit: number): Effect.Effect<SubjectActivitySummary[], DatabaseError>
  findSummaryById(id: string): Effect.Effect<SubjectActivitySummary | null, DatabaseError>
  findAllIds(): Effect.Effect<string[], DatabaseError>
}
