import * as S from 'effect/Schema'

export const PublicFigureStats = S.Struct({
  publicFigureId: S.String,
  statementsCount: S.Number,
  subjectsCount: S.Number
})

export type PublicFigureStats = S.Schema.Type<typeof PublicFigureStats>