/**
 * What the admin API accepts to create or correct an organisation: the raw
 * fields of the organisation form, as `readOrganisationFields` reads them from
 * a FormData. Whether they hold up (type on the list, presentation long
 * enough, Wikipedia page about an organisation) is the command's judgement.
 */
import { objectWithFields, textField } from '../json-input'

export type OrganisationInput = {
  name: string
  acronym: string
  organisationType: string
  presentation: string
  wikipediaUrl: string
  websiteUrl: string
  notorietySources: string[]
}

const TEXT_FIELDS = [
  'name',
  'acronym',
  'organisationType',
  'presentation',
  'wikipediaUrl',
  'websiteUrl',
] as const

const FIELDS: ReadonlySet<string> = new Set([...TEXT_FIELDS, 'notorietySources'])

function sources(value: unknown): { sources: string[] } | { error: string } {
  if (!Array.isArray(value) || value.some((source) => typeof source !== 'string')) {
    return { error: 'Field notorietySources must be an array of strings' }
  }
  return { sources: value.map((source: string) => source.trim()).filter(Boolean) }
}

/** Every field of the form, an absent one as blank: what a creation takes. */
export function parseOrganisationInput(
  body: unknown,
): { fields: OrganisationInput } | { error: string } {
  const patch = parseOrganisationPatch(body)
  if ('error' in patch) return patch
  return {
    fields: {
      name: '',
      acronym: '',
      organisationType: '',
      presentation: '',
      wikipediaUrl: '',
      websiteUrl: '',
      notorietySources: [],
      ...patch.fields,
    },
  }
}

/** Only the fields sent: what a correction takes, the rest staying as it is. */
export function parseOrganisationPatch(
  body: unknown,
): { fields: Partial<OrganisationInput> } | { error: string } {
  const read = objectWithFields(body, FIELDS)
  if ('error' in read) return read
  const { input } = read

  const fields: Partial<OrganisationInput> = {}
  for (const field of TEXT_FIELDS) {
    if (!(field in input)) continue
    const value = textField(input[field], field)
    if ('error' in value) return value
    fields[field] = value.text
  }
  if ('notorietySources' in input) {
    const list = sources(input.notorietySources ?? [])
    if ('error' in list) return list
    fields.notorietySources = list.sources
  }
  return { fields }
}
