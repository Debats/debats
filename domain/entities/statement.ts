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

export const VOTE_CHOICES = ['pour', 'contre', 'abstention'] as const
export type VoteChoice = (typeof VOTE_CHOICES)[number]

export const VOTE_CHOICE_LABELS: Record<VoteChoice, string> = {
  pour: 'pour',
  contre: 'contre',
  abstention: 'abstention',
}

export function parseVoteChoice(value: unknown): VoteChoice | null {
  const str = String(value ?? '')
  return VOTE_CHOICES.includes(str as VoteChoice) ? (str as VoteChoice) : null
}

/** How a vote is told: an act, never words the voter is made to say. */
export const voteSense = (choice: VoteChoice): string => `A voté ${VOTE_CHOICE_LABELS[choice]}`

const Quote = S.String.pipe(S.minLength(10))
const ShortLabel = S.String.pipe(S.minLength(1), S.maxLength(150))

/**
 * What a statement carries, which depends on its nature.
 *
 * A declaration and a programme carry words, quoted verbatim. A vote and an
 * act carry none of their own: a vote names the text it bears on and the way
 * it went, an act names what was done. The words that justify a vote are an
 * explication de vote — a declaration in its own right, by whoever spoke it,
 * which is rarely every voter. So no variant holds an optional quote: either
 * the statement is words, or it is a deed.
 */
export const DeclarationContent = S.Struct({ kind: S.Literal('declaration'), quote: Quote })

export const ProgramContent = S.Struct({
  kind: S.Literal('program'),
  /** The programmatic document the commitment is quoted from */
  document: ShortLabel,
  quote: Quote,
})

export const VoteContent = S.Struct({
  kind: S.Literal('vote'),
  /** The text put to the ballot, as the ballot names it */
  votedText: ShortLabel,
  choice: S.Literal(...VOTE_CHOICES),
})

export const ActContent = S.Struct({
  kind: S.Literal('act'),
  /** What was done, as a short factual noun phrase */
  deed: ShortLabel,
})

export const StatementContent = S.Union(DeclarationContent, ProgramContent, VoteContent, ActContent)
export type StatementContent = S.Schema.Type<typeof StatementContent>

export const declarationContent = (quote: string): StatementContent =>
  DeclarationContent.make({ kind: 'declaration', quote: quote.trim() })

export const programContent = (document: string, quote: string): StatementContent =>
  ProgramContent.make({ kind: 'program', document: document.trim(), quote: quote.trim() })

export const voteContent = (votedText: string, choice: VoteChoice): StatementContent =>
  VoteContent.make({ kind: 'vote', votedText: votedText.trim(), choice })

export const actContent = (deed: string): StatementContent =>
  ActContent.make({ kind: 'act', deed: deed.trim() })

/** The type of a statement is the nature of what it carries. */
export const statementTypeOf = (content: StatementContent): StatementType => content.kind

/** The words, when the statement has any of its own. */
export const quoteOf = (content: StatementContent): string | undefined =>
  content.kind === 'declaration' || content.kind === 'program' ? content.quote : undefined

/**
 * What the statement carries, on one line, for a context that can only show
 * text — an OpenGraph image, a meta description. A vote and an act are named
 * as the facts they are, never set as if they had been spoken.
 */
export const contentLine = (content: StatementContent): string => {
  switch (content.kind) {
    case 'declaration':
    case 'program':
      return content.quote
    case 'vote':
      return `${voteSense(content.choice)} : ${content.votedText}`
    case 'act':
      return content.deed
  }
}

export const Statement = S.Struct({
  id: StatementId,
  author: StatementAuthor,
  positionId: S.String,
  content: StatementContent,
  sourceName: S.String.pipe(S.minLength(1), S.maxLength(255)),
  /** Verifiability is the promise of the site, so a source is never optional */
  sourceUrl: S.String.pipe(S.minLength(1)),
  statedAt: S.Date,
  createdBy: S.optional(S.String),
  createdAt: S.Date,
  updatedAt: S.Date,
})

export type Statement = S.Schema.Type<typeof Statement>
