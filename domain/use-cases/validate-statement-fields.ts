import * as S from 'effect/Schema'
import { Either } from 'effect'
import { ArrayFormatter } from 'effect/ParseResult'
import { FieldErrors } from './types'

export const StatementFieldsInput = S.Struct({
  sourceName: S.String.pipe(S.minLength(1)),
  sourceUrl: S.optional(S.String),
  quote: S.String.pipe(S.minLength(10)),
  statedAt: S.String.pipe(S.pattern(/^\d{4}-\d{2}-\d{2}$/)),
})

export function validateStatementFields(fields: {
  sourceName: string
  sourceUrl: string
  quote: string
  statedAt: string
}): (string | FieldErrors) | null {
  const decoded = S.decodeUnknownEither(StatementFieldsInput)({
    sourceName: fields.sourceName,
    sourceUrl: fields.sourceUrl || undefined,
    quote: fields.quote,
    statedAt: fields.statedAt,
  })

  if (Either.isRight(decoded)) return null

  const issues = ArrayFormatter.formatErrorSync(decoded.left)
  const fieldErrors: FieldErrors = {}
  for (const issue of issues) {
    const field = issue.path.join('.')
    if (field === 'sourceName') {
      fieldErrors.sourceName = 'Le nom de la source est requis.'
    } else if (field === 'quote') {
      fieldErrors.quote = 'La citation doit faire au moins 10 caractères.'
    } else if (field === 'statedAt') {
      fieldErrors.statedAt = 'La date de la déclaration est invalide (format attendu : AAAA-MM-JJ).'
    }
  }
  return Object.keys(fieldErrors).length > 0 ? fieldErrors : 'Données invalides.'
}
