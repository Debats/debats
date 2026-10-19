import { Effect } from 'effect'
import { Position } from '../entities/position'
import { DatabaseError } from './errors'

/** Reads the positions projection; writes go through the subject stream (domain/aggregates/subject.ts) */
export interface PositionRepository {
  findById(id: string): Effect.Effect<Position | null, DatabaseError>
  findBySubjectAndSlug(
    subjectId: string,
    slug: string,
  ): Effect.Effect<Position | null, DatabaseError>
  findBySubjectId(subjectId: string): Effect.Effect<Position[], DatabaseError>
}
