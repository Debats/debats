import * as S from 'effect/Schema'

export const StatementId = S.String.pipe(S.brand('StatementId'))
export type StatementId = S.Schema.Type<typeof StatementId>

export const Statement = S.Struct({
  id: StatementId,
  publicFigureId: S.String,
  positionId: S.String,
  sourceName: S.String.pipe(S.minLength(1), S.maxLength(255)),
  sourceUrl: S.optional(S.String),
  quote: S.String.pipe(S.minLength(10)),
  statedAt: S.Date,
  createdBy: S.optional(S.String),
  createdAt: S.Date,
  updatedAt: S.Date,
})

export type Statement = S.Schema.Type<typeof Statement>

export const createStatement = (params: {
  publicFigureId: string
  positionId: string
  sourceName: string
  sourceUrl?: string
  quote: string
  statedAt: Date
  createdBy?: string
}): Statement => {
  const now = new Date()

  return Statement.make({
    id: StatementId.make(crypto.randomUUID()),
    publicFigureId: params.publicFigureId,
    positionId: params.positionId,
    sourceName: params.sourceName,
    sourceUrl: params.sourceUrl,
    quote: params.quote,
    statedAt: params.statedAt,
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  })
}

export const updateStatement = (
  statement: Statement,
  params: {
    sourceName?: string
    sourceUrl?: string
    quote?: string
    statedAt?: Date
  },
): Statement => {
  const updated = { ...statement, updatedAt: new Date() }
  if (params.sourceName !== undefined) updated.sourceName = params.sourceName
  if (params.sourceUrl !== undefined) updated.sourceUrl = params.sourceUrl
  if (params.quote !== undefined) updated.quote = params.quote
  if (params.statedAt !== undefined) updated.statedAt = params.statedAt
  return updated
}

/**
 * Lightweight projection for the "latest statements" sidebar
 */
export interface LatestStatement {
  statementId: string
  publicFigureName: string
  publicFigureSlug: string
  positionTitle: string
  subjectTitle: string
  subjectSlug: string
  statedAt: Date
}
