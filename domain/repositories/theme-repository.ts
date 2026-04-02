import { Effect } from 'effect'
import { Theme } from '../entities/theme'
import { DatabaseError } from './errors'

export interface ThemeRepository {
  findAll(): Effect.Effect<Theme[], DatabaseError>

  findBySlug(slug: string): Effect.Effect<Theme | null, DatabaseError>

  findById(id: string): Effect.Effect<Theme | null, DatabaseError>

  findByIds(ids: string[]): Effect.Effect<Theme[], DatabaseError>

  create(theme: Theme): Effect.Effect<Theme, DatabaseError>

  update(theme: Theme): Effect.Effect<Theme, DatabaseError>

  delete(id: string): Effect.Effect<void, DatabaseError>

  findBySubjectId(subjectId: string): Effect.Effect<Theme[], DatabaseError>

  assignToSubject(
    subjectId: string,
    themeId: string,
    createdBy: string,
  ): Effect.Effect<void, DatabaseError>

  removeFromSubject(subjectId: string, themeId: string): Effect.Effect<void, DatabaseError>
}
