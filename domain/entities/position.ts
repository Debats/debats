import * as S from 'effect/Schema'
import { slugify } from '../value-objects/slug'

export const PositionId = S.String.pipe(S.brand('PositionId'))
export type PositionId = S.Schema.Type<typeof PositionId>

export const PositionSlug = S.String.pipe(
  S.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  S.brand('PositionSlug'),
)
export type PositionSlug = S.Schema.Type<typeof PositionSlug>

export const PositionTitle = S.String.pipe(
  S.minLength(3),
  S.maxLength(255),
  S.brand('PositionTitle'),
)
export type PositionTitle = S.Schema.Type<typeof PositionTitle>

export const Position = S.Struct({
  id: PositionId,
  title: PositionTitle,
  slug: PositionSlug,
  description: S.String.pipe(S.minLength(10)),
  subjectId: S.String,
  createdBy: S.optional(S.String),
  createdAt: S.Date,
  updatedAt: S.Date,
})

export type Position = S.Schema.Type<typeof Position>

export const generateSlug = (title: string): PositionSlug => PositionSlug.make(slugify(title))
