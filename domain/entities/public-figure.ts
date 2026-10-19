import * as S from 'effect/Schema'
import { Option } from 'effect'
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

export const createPublicFigure = (params: {
  name: string
  presentation: string
  wikipediaUrl?: string
  notorietySources?: string[]
  websiteUrl?: string
  createdBy: string
}): PublicFigure => {
  const now = new Date()

  return PublicFigure.make({
    id: PublicFigureId.make(crypto.randomUUID()),
    name: PublicFigureName.make(params.name),
    slug: generateSlug(params.name),
    presentation: params.presentation,
    wikipediaUrl: params.wikipediaUrl ? Option.some(params.wikipediaUrl) : Option.none(),
    notorietySources: params.notorietySources ?? [],
    websiteUrl: params.websiteUrl ? Option.some(params.websiteUrl) : Option.none(),
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  })
}
