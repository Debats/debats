import * as S from 'effect/Schema'
import { slugify } from '../value-objects/slug'

export const PublicFigureId = S.String.pipe(S.brand('PublicFigureId'))
export type PublicFigureId = S.Schema.Type<typeof PublicFigureId>

export const PublicFigureSlug = S.String.pipe(
  S.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  S.brand('PublicFigureSlug'),
)
export type PublicFigureSlug = S.Schema.Type<typeof PublicFigureSlug>

export const PublicFigureName = S.String.pipe(
  S.minLength(2),
  S.maxLength(100),
  S.brand('PublicFigureName'),
)
export type PublicFigureName = S.Schema.Type<typeof PublicFigureName>

export const PublicFigure = S.Struct({
  id: PublicFigureId,
  name: PublicFigureName,
  slug: PublicFigureSlug,
  presentation: S.String.pipe(S.minLength(10)),
  wikipediaUrl: S.Option(S.String),
  notorietySources: S.Array(S.String),
  websiteUrl: S.Option(S.String),
  createdBy: S.String, // Obligatoire : traçabilité
  createdAt: S.Date,
  updatedAt: S.Date,
})

export type PublicFigure = S.Schema.Type<typeof PublicFigure>

export const generateSlug = (name: string): PublicFigureSlug => PublicFigureSlug.make(slugify(name))
