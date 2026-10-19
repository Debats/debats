import { slugify } from '../../../domain/value-objects/slug'
import {
  DraftAffiliation,
  DraftArgument,
  DraftAuthor,
  DraftOccupation,
  DraftOrganisationData,
  DraftPublicFigureData,
  draftOrganisationAuthor,
  draftPublicFigureAuthor,
} from '../../../domain/entities/draft-statement'
import { ORGANISATION_TYPES, parseOrganisationType } from '../../../domain/entities/organisation'

const SLUGIFIABLE_FIELDS = ['subjectTitle', 'positionTitle'] as const

const ARGUMENT_TITLE_MIN = 3
const ARGUMENT_TITLE_MAX = 255
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** An argument title is the same whatever its case, as it is site-wide unique. */
const sameTitle = (a: string, b: string) => a.localeCompare(b, 'fr', { sensitivity: 'base' }) === 0

function asArray(value: unknown, field: string): { items: unknown[] } | { error: string } {
  if (value === undefined || value === null) return { items: [] }
  if (!Array.isArray(value)) return { error: `Field ${field} must be an array` }
  return { items: value }
}

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

/**
 * Parses the arguments the statement mobilises. A title already used elsewhere
 * on the site is reused at validation, so only its wording matters here.
 */
export function parseDraftArguments(
  value: unknown,
): { arguments: DraftArgument[] } | { error: string } {
  const list = asArray(value, 'arguments')
  if ('error' in list) return list

  const parsed: DraftArgument[] = []
  for (let index = 0; index < list.items.length; index++) {
    const item = list.items[index]
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      return { error: `Field arguments[${index}] must be an object with a title` }
    }

    const { title, description } = item as Record<string, unknown>
    const trimmedTitle = typeof title === 'string' ? title.trim() : ''
    if (trimmedTitle.length < ARGUMENT_TITLE_MIN || trimmedTitle.length > ARGUMENT_TITLE_MAX) {
      return {
        error: `Field arguments[${index}].title must be ${ARGUMENT_TITLE_MIN} to ${ARGUMENT_TITLE_MAX} characters`,
      }
    }
    if (description !== undefined && typeof description !== 'string') {
      return { error: `Field arguments[${index}].description must be a string` }
    }

    if (parsed.some((a) => sameTitle(a.title, trimmedTitle))) continue
    const trimmedDescription = description?.trim()
    parsed.push(
      trimmedDescription
        ? { title: trimmedTitle, description: trimmedDescription }
        : { title: trimmedTitle },
    )
  }

  return { arguments: parsed }
}

/**
 * Parses the occupations of the public figure author. A bare name reads as a
 * current occupation; a former one is `{ name, current: false }`. Names are
 * checked against the closed list when the draft is posted, not here.
 */
export function parseDraftOccupations(
  value: unknown,
): { occupations: DraftOccupation[] } | { error: string } {
  const list = asArray(value, 'occupations')
  if ('error' in list) return list

  const byName = new Map<string, DraftOccupation>()
  for (let index = 0; index < list.items.length; index++) {
    const item = list.items[index]
    const { name, current } =
      typeof item === 'string'
        ? { name: item, current: true }
        : ((item ?? {}) as Record<string, unknown>)

    if (typeof name !== 'string' || !name.trim()) {
      return { error: `Field occupations[${index}] must name an occupation` }
    }
    if (current !== undefined && typeof current !== 'boolean') {
      return { error: `Field occupations[${index}].current must be a boolean` }
    }

    const trimmed = name.trim()
    byName.set(trimmed, { name: trimmed, current: current ?? true })
  }

  return { occupations: Array.from(byName.values()) }
}

/** Parses one optional ISO date of an affiliation. */
function parseAffiliationDate(
  value: unknown,
  field: string,
): { date: string | undefined } | { error: string } {
  if (value === undefined || value === null || value === '') return { date: undefined }
  if (typeof value !== 'string' || !ISO_DATE.test(value)) {
    return { error: `Field ${field} must be a date (YYYY-MM-DD)` }
  }
  return { date: value }
}

/**
 * Parses the organisations the public figure author belongs to.
 * `organisationData` is only needed for an organisation yet to be created.
 */
export function parseDraftAffiliations(
  value: unknown,
): { affiliations: DraftAffiliation[] } | { error: string } {
  const list = asArray(value, 'affiliations')
  if ('error' in list) return list

  const parsed: DraftAffiliation[] = []
  for (let index = 0; index < list.items.length; index++) {
    const item = list.items[index]
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      return { error: `Field affiliations[${index}] must be an object with an organisation` }
    }

    const { organisation, organisationData, role } = item as Record<string, unknown>
    if (typeof organisation !== 'string' || !slugify(organisation)) {
      return {
        error: `Field affiliations[${index}].organisation must contain at least one alphanumeric character`,
      }
    }
    if (role !== undefined && typeof role !== 'string') {
      return { error: `Field affiliations[${index}].role must be a string` }
    }

    const startedOn = parseAffiliationDate(
      (item as Record<string, unknown>).startedOn,
      `affiliations[${index}].startedOn`,
    )
    if ('error' in startedOn) return startedOn
    const endedOn = parseAffiliationDate(
      (item as Record<string, unknown>).endedOn,
      `affiliations[${index}].endedOn`,
    )
    if ('error' in endedOn) return endedOn

    const affiliation: DraftAffiliation = { organisation }
    if (organisationData !== undefined && organisationData !== null) {
      if (typeof organisationData !== 'object' || Array.isArray(organisationData)) {
        return { error: `Field affiliations[${index}].organisationData must be an object` }
      }
      const parsedType = parseOrganisationType(
        (organisationData as Record<string, unknown>).organisationType,
      )
      if (!parsedType) {
        return {
          error: `Field affiliations[${index}].organisationData.organisationType must be one of: ${ORGANISATION_TYPES.join(', ')}`,
        }
      }
      affiliation.organisationData = {
        ...(organisationData as Omit<DraftOrganisationData, 'organisationType'>),
        organisationType: parsedType,
      }
    }
    if (role) affiliation.role = role
    if (startedOn.date) affiliation.startedOn = startedOn.date
    if (endedOn.date) affiliation.endedOn = endedOn.date

    parsed.push(affiliation)
  }

  return { affiliations: parsed }
}
