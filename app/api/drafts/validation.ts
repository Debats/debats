import { slugify } from '../../../domain/value-objects/slug'

const SLUGIFIABLE_FIELDS = ['publicFigureName', 'subjectTitle', 'positionTitle'] as const

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
