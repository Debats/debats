import { Context, Effect } from 'effect'
import { PublicFigure } from '../entities/public-figure'
import { PublicFigureActivitySummary } from '../value-objects/public-figure-activity-summary'
import { PublicFigureStats } from '../value-objects/public-figure-stats'

export class DatabaseError extends Error {
  readonly _tag = 'DatabaseError'
}

export interface PublicFigureRepository {
  findAll(): Effect.Effect<PublicFigure[], DatabaseError>

  searchByName(query: string, limit?: number): Effect.Effect<PublicFigure[], DatabaseError>

  findBySlug(slug: string): Effect.Effect<PublicFigure | null, DatabaseError>

  findById(id: string): Effect.Effect<PublicFigure | null, DatabaseError>

  findByWikipediaUrl(url: string): Effect.Effect<PublicFigure | null, DatabaseError>

  create(publicFigure: PublicFigure): Effect.Effect<PublicFigure, DatabaseError>

  update(publicFigure: PublicFigure): Effect.Effect<PublicFigure, DatabaseError>

  delete(id: string): Effect.Effect<void, DatabaseError>

  getStats(publicFigureId: string): Effect.Effect<PublicFigureStats, DatabaseError>

  findSummariesByActivity(
    limit: number,
    orderBy?: 'subjects_count' | 'latest_statement_at',
  ): Effect.Effect<PublicFigureActivitySummary[], DatabaseError>

  findByLetter(letter: string): Effect.Effect<PublicFigureActivitySummary[], DatabaseError>
}

export const PublicFigureRepository =
  Context.GenericTag<PublicFigureRepository>('PublicFigureRepository')
