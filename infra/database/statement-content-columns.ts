import {
  actContent,
  declarationContent,
  programContent,
  StatementContent,
  StatementType,
  voteContent,
  VoteChoice,
} from '../../domain/entities/statement'

/**
 * What a statement carries is one union in the domain and flat columns in the
 * database: the type is the discriminant, and only the columns of that variant
 * are filled. This module is the only place the two shapes meet.
 */
export type StatementContentColumns = {
  statement_type: StatementType
  quote: string | null
  document_name: string | null
  voted_text: string | null
  vote_choice: VoteChoice | null
  deed: string | null
}

/** Reading a row whose columns contradict its type is a bug, never a default. */
function missing(column: string, type: StatementType): never {
  throw new Error(`Statement of type "${type}" has no ${column}`)
}

export function toStatementContent(row: StatementContentColumns): StatementContent {
  switch (row.statement_type) {
    case 'declaration':
      return row.quote ? declarationContent(row.quote) : missing('quote', row.statement_type)
    case 'program':
      if (!row.quote) return missing('quote', row.statement_type)
      if (!row.document_name) return missing('document_name', row.statement_type)
      return programContent(row.document_name, row.quote)
    case 'vote':
      if (!row.voted_text) return missing('voted_text', row.statement_type)
      if (!row.vote_choice) return missing('vote_choice', row.statement_type)
      return voteContent(row.voted_text, row.vote_choice)
    case 'act':
      return row.deed ? actContent(row.deed) : missing('deed', row.statement_type)
  }
}

const EMPTY = {
  quote: null,
  document_name: null,
  voted_text: null,
  vote_choice: null,
  deed: null,
}

export function fromStatementContent(content: StatementContent): StatementContentColumns {
  switch (content.kind) {
    case 'declaration':
      return { ...EMPTY, statement_type: 'declaration', quote: content.quote }
    case 'program':
      return {
        ...EMPTY,
        statement_type: 'program',
        quote: content.quote,
        document_name: content.document,
      }
    case 'vote':
      return {
        ...EMPTY,
        statement_type: 'vote',
        voted_text: content.votedText,
        vote_choice: content.choice,
      }
    case 'act':
      return { ...EMPTY, statement_type: 'act', deed: content.deed }
  }
}
