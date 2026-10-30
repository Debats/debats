import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { quoteOf, StatementContent, STATEMENT_TYPES } from '../entities/statement'
import { fieldsOf } from './preconditions'

const StatementFieldsInput = S.Struct({
  sourceName: S.String.pipe(S.minLength(1)),
  /** Verifiability is the promise of the site, so the link is never optional */
  sourceUrl: S.String.pipe(S.minLength(1)),
  statedAt: S.String.pipe(S.pattern(/^\d{4}-\d{2}-\d{2}$/)),
})

const FIELD_MESSAGES = {
  sourceName: 'Le nom de la source est requis.',
  sourceUrl: 'Le lien vers la source est requis.',
  statedAt: 'La date de la déclaration est invalide (format attendu : AAAA-MM-JJ).',
}

/** What the form says of the statement's source, decoded */
export const statementFields = (fields: {
  sourceName: string
  sourceUrl: string
  statedAt: string
}) => fieldsOf(StatementFieldsInput, FIELD_MESSAGES)(fields)

/** Every field the form can hold, whichever type is selected */
export type StatementContentInput = {
  statementType: string
  quote: string
  document: string
  votedText: string
  choice: string
  deed: string
}

/** A form with nothing typed in yet: a declaration, which most statements are */
export const EMPTY_CONTENT_INPUT: StatementContentInput = {
  statementType: 'declaration',
  quote: '',
  document: '',
  votedText: '',
  choice: '',
  deed: '',
}

/** The fields a form opens with for a statement already recorded */
export const contentFieldsOf = (content: StatementContent): StatementContentInput => ({
  statementType: content.kind,
  quote: quoteOf(content) ?? '',
  document: content.kind === 'program' ? content.document : '',
  votedText: content.kind === 'vote' ? content.votedText : '',
  choice: content.kind === 'vote' ? content.choice : '',
  deed: content.kind === 'act' ? content.deed : '',
})

const StatementKindInput = S.Struct({ statementType: S.Literal(...STATEMENT_TYPES) })

const KIND_MESSAGE = { statementType: 'Choisissez la nature de la prise de position.' }

const CONTENT_MESSAGES = {
  quote: 'La citation doit faire au moins 10 caractères.',
  document: 'Le document programmatique est requis, en 150 caractères au plus.',
  votedText: 'Le texte soumis au vote est requis, en 150 caractères au plus.',
  choice: 'Indiquez un vote pour, contre, ou une abstention.',
  deed: 'Décrivez l’acte en quelques mots, en 150 caractères au plus.',
}

/**
 * What the form says the statement carries, read according to its type. The
 * fields the other types would have used are left aside rather than stored
 * where nothing will read them: the union only keeps what its variant names.
 */
export const statementContent = (fields: StatementContentInput) =>
  pipe(
    fieldsOf(StatementKindInput, KIND_MESSAGE)(fields),
    Effect.flatMap(({ statementType }) =>
      fieldsOf(
        StatementContent,
        CONTENT_MESSAGES,
      )({
        kind: statementType,
        quote: fields.quote.trim(),
        document: fields.document.trim(),
        votedText: fields.votedText.trim(),
        choice: fields.choice.trim(),
        deed: fields.deed.trim(),
      }),
    ),
  )
