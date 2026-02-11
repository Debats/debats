import * as S from 'effect/Schema'

export const PositionId = S.String.pipe(S.brand('PositionId'))
export type PositionId = S.Schema.Type<typeof PositionId>

export const PositionTitle = S.String.pipe(
  S.minLength(3),
  S.maxLength(255),
  S.brand('PositionTitle'),
)
export type PositionTitle = S.Schema.Type<typeof PositionTitle>

export const Position = S.Struct({
  id: PositionId,
  title: PositionTitle,
  description: S.String.pipe(S.minLength(10)),
  subjectId: S.String,
  createdBy: S.optional(S.String),
  createdAt: S.Date,
  updatedAt: S.Date,
})

export type Position = S.Schema.Type<typeof Position>

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
