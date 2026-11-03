/**
 * What the admin API accepts to affiliate a public figure: the same fields as
 * the form of `/p/<slug>/affilier`, the organisation named by its slug. The
 * rules of the affiliation itself (role length, period order) belong to the
 * command; this only reads the JSON.
 */
import { dayField, objectWithFields, textField } from '../json-input'

export type AffiliationInput = {
  organisation: string
  role: string
  /** ISO day (YYYY-MM-DD) or empty */
  startedOn: string
  endedOn: string
}

const FIELDS: ReadonlySet<string> = new Set(['organisation', 'role', 'startedOn', 'endedOn'])

export function parseAffiliationInput(
  body: unknown,
): { affiliation: AffiliationInput } | { error: string } {
  const read = objectWithFields(body, FIELDS)
  if ('error' in read) return read
  const { input } = read

  const organisation = textField(input.organisation, 'organisation')
  if ('error' in organisation) return organisation
  if (!organisation.text) {
    return {
      error: 'Field organisation is required: the slug of an organisation of the catalogue',
    }
  }
  const role = textField(input.role, 'role')
  if ('error' in role) return role
  const startedOn = dayField(input.startedOn, 'startedOn')
  if ('error' in startedOn) return startedOn
  const endedOn = dayField(input.endedOn, 'endedOn')
  if ('error' in endedOn) return endedOn

  return {
    affiliation: {
      organisation: organisation.text,
      role: role.text,
      startedOn: startedOn.day,
      endedOn: endedOn.day,
    },
  }
}
