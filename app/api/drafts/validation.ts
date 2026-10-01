import { slugify } from '../../../domain/value-objects/slug'
import {
  DraftAuthor,
  DraftOrganisationData,
  DraftPublicFigureData,
  draftOrganisationAuthor,
  draftPublicFigureAuthor,
} from '../../../domain/entities/draft-statement'
import { ORGANISATION_TYPES, parseOrganisationType } from '../../../domain/entities/organisation'

const SLUGIFIABLE_FIELDS = ['subjectTitle', 'positionTitle'] as const

export function validateSlugifiableFields(
  data: Record<string, unknown>,
  partial: boolean,
): string | null {
  for (const field of SLUGIFIABLE_FIELDS) {
    if (partial && !(field in data)) continue
    const value = data[field]
    if (typeof value !== 'string' || !slugify(value)) {
      return `Field ${field} must contain at least one alphanumeric character`
    }
  }
  return null
}

type ParsedAuthor = { author: DraftAuthor } | { error: string }

/**
 * Parses the author of a draft: a public figure or an organisation, never both.
 * `data` is only needed when the entity does not exist yet.
 */
export function parseDraftAuthor(value: unknown): ParsedAuthor {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { error: 'Field author must be an object with a kind and a name' }
  }

  const { kind, name, data } = value as Record<string, unknown>

  if (kind !== 'public_figure' && kind !== 'organisation') {
    return { error: 'Field author.kind must be "public_figure" or "organisation"' }
  }

  if (typeof name !== 'string' || !slugify(name)) {
    return { error: 'Field author.name must contain at least one alphanumeric character' }
  }

  if (data === undefined || data === null) {
    return { author: { kind, name, data: null } }
  }

  if (typeof data !== 'object' || Array.isArray(data)) {
    return { error: 'Field author.data must be an object' }
  }

  if (kind === 'public_figure') {
    return { author: draftPublicFigureAuthor(name, data as DraftPublicFigureData) }
  }

  const { organisationType } = data as Record<string, unknown>
  const parsedType = parseOrganisationType(organisationType)
  if (!parsedType) {
    return {
      error: `Field author.data.organisationType must be one of: ${ORGANISATION_TYPES.join(', ')}`,
    }
  }

  return {
    author: draftOrganisationAuthor(name, {
      ...(data as Omit<DraftOrganisationData, 'organisationType'>),
      organisationType: parsedType,
    }),
  }
}
