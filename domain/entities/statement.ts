import * as S from 'effect/Schema'

export const StatementId = S.String.pipe(S.brand('StatementId'))
export type StatementId = S.Schema.Type<typeof StatementId>

export const STATEMENT_TYPES = ['declaration', 'vote', 'program', 'act'] as const
export type StatementType = (typeof STATEMENT_TYPES)[number]

export const STATEMENT_TYPE_LABELS: Record<StatementType, string> = {
  declaration: 'Déclaration',
  vote: 'Vote',
  program: 'Programme',
  act: 'Acte',
}

export function parseStatementType(value: unknown): StatementType {
  const str = String(value ?? '')
  return STATEMENT_TYPES.includes(str as StatementType) ? (str as StatementType) : 'declaration'
}

/**
 * Who takes position: a public figure or an organisation, never both.
 * Organisations speak through communiqués, programmes, votes and actions.
 */
export const StatementAuthor = S.Union(
  S.Struct({ kind: S.Literal('public_figure'), id: S.String }),
  S.Struct({ kind: S.Literal('organisation'), id: S.String }),
)
export type StatementAuthor = S.Schema.Type<typeof StatementAuthor>
export type StatementAuthorKind = StatementAuthor['kind']

export const publicFigureAuthor = (id: string): StatementAuthor => ({ kind: 'public_figure', id })
export const organisationAuthor = (id: string): StatementAuthor => ({ kind: 'organisation', id })

export const Statement = S.Struct({
  id: StatementId,
  author: StatementAuthor,
  positionId: S.String,
  statementType: S.Literal(...STATEMENT_TYPES),
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
  author: StatementAuthor
  positionId: string
  statementType: StatementType
  sourceName: string
  sourceUrl?: string
  quote: string
  statedAt: Date
  createdBy?: string
}): Statement => {
  const now = new Date()

  return Statement.make({
    id: StatementId.make(crypto.randomUUID()),
    author: params.author,
    positionId: params.positionId,
    statementType: params.statementType,
    sourceName: params.sourceName,
    sourceUrl: params.sourceUrl,
    quote: params.quote,
    statedAt: params.statedAt,
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  })
}
