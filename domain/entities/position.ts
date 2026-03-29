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

export const createPosition = (params: {
  title: string
  description: string
  subjectId: string
  createdBy?: string
}): Position => {
  const now = new Date()

  return Position.make({
    id: PositionId.make(crypto.randomUUID()),
    title: PositionTitle.make(params.title),
    slug: generateSlug(params.title),
    description: params.description,
    subjectId: params.subjectId,
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  })
}

export const updatePositionTitle = (position: Position, newTitle: string): Position => ({
  ...position,
  title: PositionTitle.make(newTitle),
  slug: generateSlug(newTitle),
  updatedAt: new Date(),
})

export const updatePositionDescription = (
  position: Position,
  newDescription: string,
): Position => ({
  ...position,
  description: newDescription,
  updatedAt: new Date(),
})
