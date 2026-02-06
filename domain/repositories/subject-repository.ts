import { Effect } from "effect"
import { Subject } from "../entities/subject"
import { SubjectStats } from "../value-objects/subject-stats"

export class DatabaseError extends Error {
  readonly _tag = "DatabaseError"
}

export interface SubjectRepository {
  findAll(): Effect.Effect<Subject[], DatabaseError>

  findBySlug(slug: string): Effect.Effect<Subject | null, DatabaseError>

  findById(id: string): Effect.Effect<Subject | null, DatabaseError>

  create(subject: Subject): Effect.Effect<Subject, DatabaseError>

  update(subject: Subject): Effect.Effect<Subject, DatabaseError>

  delete(id: string): Effect.Effect<void, DatabaseError>

  getStats(subjectId: string): Effect.Effect<SubjectStats, DatabaseError>
}