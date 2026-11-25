import {
  organisationAuthor,
  publicFigureAuthor,
  StatementAuthor,
} from '../../domain/entities/statement'

/**
 * Brings back to an author what a client says an existing author is, to read
 * what the site knows of her.
 *
 * A Server Function receives JSON, not the type it declares: an author is one
 * only with an id and one of the two kinds the site knows. Nothing is assumed
 * of another kind: reading the statements of a personality under the id of an
 * organisation would answer for the wrong author.
 */
export function authorRefOf(value: unknown): StatementAuthor | null {
  if (!value || typeof value !== 'object') return null
  const { kind, id } = value as { kind?: unknown; id?: unknown }
  if (typeof id !== 'string' || !id) return null
  if (kind === 'organisation') return organisationAuthor(id)
  if (kind === 'public_figure') return publicFigureAuthor(id)
  return null
}
