import { Effect } from 'effect'
import { Subject } from '../entities/subject'
import { DatabaseError } from './errors'

/** Reads the links between subjects; they are written by the subject stream (domain/aggregates/subject.ts) */
export interface RelatedSubjectsRepository {
  findRelated(subjectId: string): Effect.Effect<Subject[], DatabaseError>
}
