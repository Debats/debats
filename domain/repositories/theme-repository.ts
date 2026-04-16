import { Effect } from 'effect'
import { Theme } from '../entities/theme'
import { DatabaseError } from './errors'

export interface ThemeAssignment {
  theme: Theme
  isPrimary: boolean
}

export interface ThemeRepository {
  findAll(): Effect.Effect<Theme[], DatabaseError>

  findBySlug(slug: string): Effect.Effect<Theme | null, DatabaseError>

  findById(id: string): Effect.Effect<Theme | null, DatabaseError>

  findByIds(ids: string[]): Effect.Effect<Theme[], DatabaseError>

  create(theme: Theme): Effect.Effect<Theme, DatabaseError>

  update(theme: Theme): Effect.Effect<Theme, DatabaseError>

  delete(id: string): Effect.Effect<void, DatabaseError>

  /**
   * Returns themes assigned to a subject, ordered with the primary one first.
   */
  findAssignmentsBySubjectId(subjectId: string): Effect.Effect<ThemeAssignment[], DatabaseError>

  /**
   * Atomically replaces all theme assignments for a subject.
   * At most one assignment may have isPrimary = true.
   */
  setAssignments(
    subjectId: string,
    assignments: Array<{ themeId: string; isPrimary: boolean }>,
    createdBy: string,
  ): Effect.Effect<void, DatabaseError>
}
