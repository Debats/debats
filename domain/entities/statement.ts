import * as S from 'effect/Schema'

export const StatementId = S.String.pipe(S.brand('StatementId'))
export type StatementId = S.Schema.Type<typeof StatementId>

export const Statement = S.Struct({
  id: StatementId,
  publicFigureId: S.String,
  positionId: S.String,
  takenAt: S.optional(S.Date),
  createdBy: S.optional(S.String),
  createdAt: S.Date,
  updatedAt: S.Date
})

export type Statement = S.Schema.Type<typeof Statement>

export const EvidenceId = S.String.pipe(S.brand('EvidenceId'))
export type EvidenceId = S.Schema.Type<typeof EvidenceId>

export const Evidence = S.Struct({
  id: EvidenceId,
  statementId: S.String,
  sourceName: S.String.pipe(S.minLength(1), S.maxLength(255)),
  sourceUrl: S.optional(S.String),
  quote: S.String.pipe(S.minLength(10)),
  factDate: S.Date,
  createdBy: S.optional(S.String),
  createdAt: S.Date,
  updatedAt: S.Date
})

export type Evidence = S.Schema.Type<typeof Evidence>

export const createStatement = (params: {
  publicFigureId: string
  positionId: string
  createdBy?: string
}): Statement => {
  const now = new Date()
  
  return Statement.make({
    id: StatementId.make(crypto.randomUUID()),
    publicFigureId: params.publicFigureId,
    positionId: params.positionId,
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now
  })
}

export const createEvidence = (params: {
  statementId: string
  sourceName: string
  sourceUrl?: string
  quote: string
  factDate: Date
  createdBy?: string
}): Evidence => {
  const now = new Date()
  
  return Evidence.make({
    id: EvidenceId.make(crypto.randomUUID()),
    statementId: params.statementId,
    sourceName: params.sourceName,
    sourceUrl: params.sourceUrl,
    quote: params.quote,
    factDate: params.factDate,
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now
  })
}

export const isStatementValid = (statement: Statement, evidences: Evidence[]): boolean => {
  return evidences.filter(evidence => evidence.statementId === statement.id).length >= 1
}

export const updateEvidence = (
  evidence: Evidence,
  params: {
    sourceName?: string
    sourceUrl?: string
    quote?: string
    factDate?: Date
  }
): Evidence => ({
  ...evidence,
  ...params,
  updatedAt: new Date()
})
