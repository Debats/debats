import * as S from 'effect/Schema'
import { slugify } from '../value-objects/slug'

export const ThemeId = S.String.pipe(S.brand('ThemeId'))
export type ThemeId = S.Schema.Type<typeof ThemeId>

export const ThemeSlug = S.String.pipe(
  S.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  S.brand('ThemeSlug'),
)
export type ThemeSlug = S.Schema.Type<typeof ThemeSlug>

export const ThemeName = S.String.pipe(S.minLength(2), S.maxLength(50), S.brand('ThemeName'))
export type ThemeName = S.Schema.Type<typeof ThemeName>

export const Theme = S.Struct({
  id: ThemeId,
  name: ThemeName,
  slug: ThemeSlug,
  description: S.String.pipe(S.minLength(10)),
  createdBy: S.String,
  updatedBy: S.String,
  createdAt: S.Date,
  updatedAt: S.Date,
})

export type Theme = S.Schema.Type<typeof Theme>

export const generateThemeSlug = (name: string): ThemeSlug => ThemeSlug.make(slugify(name))
