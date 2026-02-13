import { Effect } from 'effect'
import { Position } from '../entities/position'
import { DatabaseError } from './subject-repository'

export interface PositionRepository {
  findById(id: string): Effect.Effect<Position | null, DatabaseError>
  findBySubjectId(subjectId: string): Effect.Effect<Position[], DatabaseError>
}
