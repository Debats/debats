import * as S from 'effect/Schema'

export const SubjectStats = S.Struct({
  subjectId: S.String,
  positionsCount: S.Number,
  publicFiguresCount: S.Number,
  organisationsCount: S.Number,
  statementsCount: S.Number,
  /** Statements made by public figures */
  figureStatementsCount: S.Number,
  /** Statements made by organisations */
  organisationStatementsCount: S.Number,
})

export type SubjectStats = S.Schema.Type<typeof SubjectStats>
