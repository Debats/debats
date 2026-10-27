import * as S from 'effect/Schema'
import { fieldsOf } from './preconditions'

const StatementFieldsInput = S.Struct({
  sourceName: S.String.pipe(S.minLength(1)),
  sourceUrl: S.optional(S.String),
  quote: S.String.pipe(S.minLength(10)),
  statedAt: S.String.pipe(S.pattern(/^\d{4}-\d{2}-\d{2}$/)),
})

const FIELD_MESSAGES = {
  sourceName: 'Le nom de la source est requis.',
  quote: 'La citation doit faire au moins 10 caractères.',
  statedAt: 'La date de la déclaration est invalide (format attendu : AAAA-MM-JJ).',
}

/** What the form says of the statement's source, decoded; an empty URL is none */
export const statementFields = (fields: {
  sourceName: string
  sourceUrl: string
  quote: string
  statedAt: string
}) =>
  fieldsOf(
    StatementFieldsInput,
    FIELD_MESSAGES,
  )({ ...fields, sourceUrl: fields.sourceUrl || undefined })
