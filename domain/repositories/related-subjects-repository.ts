import { Effect } from 'effect'
import { Subject } from '../entities/subject'
import { DatabaseError } from './errors'

export interface RelatedSubjectsRepository {
  findRelated(subjectId: string): Effect.Effect<Subject[], DatabaseError>

  link(
    subjectId1: string,
    subjectId2: string,
    createdBy: string,
  ): Effect.Effect<void, DatabaseError>

  unlink(subjectId1: string, subjectId2: string): Effect.Effect<void, DatabaseError>
}
