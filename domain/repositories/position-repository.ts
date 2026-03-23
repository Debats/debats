import { Effect } from 'effect'
import { Position } from '../entities/position'
import { DatabaseError } from './errors'

export interface PositionRepository {
  findById(id: string): Effect.Effect<Position | null, DatabaseError>
  findBySubjectId(subjectId: string): Effect.Effect<Position[], DatabaseError>
  create(position: Position): Effect.Effect<Position, DatabaseError>
  update(position: Position): Effect.Effect<Position, DatabaseError>
}
