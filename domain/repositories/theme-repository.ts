import { Context, Effect } from 'effect'
import { Theme, ThemeId } from '../entities/theme'
import { DatabaseError } from './errors'

export interface ThemeAssignment {
  theme: Theme
  isPrimary: boolean
}

/** Read side of the themes: writes go through the event journal */
export interface ThemeRepository {
  findAll(): Effect.Effect<Theme[], DatabaseError>

  findBySlug(slug: string): Effect.Effect<Theme | null, DatabaseError>

  findById(id: string): Effect.Effect<Theme | null, DatabaseError>

  findByIds(ids: string[]): Effect.Effect<Theme[], DatabaseError>

  /**
   * Returns all (themeId, subjectId) pairs where is_primary = true.
   */
  findAllPrimaryLinks(): Effect.Effect<Array<{ themeId: string; subjectId: string }>, DatabaseError>

  /**
   * Returns all subject IDs assigned to a theme (primary or not).
   */
  findSubjectIdsByThemeId(themeId: ThemeId): Effect.Effect<string[], DatabaseError>

  /**
   * Returns themes assigned to a subject, ordered with the primary one first.
   */
  /** The assignments themselves are written by the subject stream (domain/aggregates/subject.ts) */
  findAssignmentsBySubjectId(subjectId: string): Effect.Effect<ThemeAssignment[], DatabaseError>
}

export const ThemeRepository = Context.GenericTag<ThemeRepository>('ThemeRepository')
