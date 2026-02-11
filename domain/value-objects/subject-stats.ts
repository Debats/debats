import * as S from 'effect/Schema'

export const SubjectStats = S.Struct({
  subjectId: S.String,
  positionsCount: S.Number,
  publicFiguresCount: S.Number,
  statementsCount: S.Number,
})

export type SubjectStats = S.Schema.Type<typeof SubjectStats>
