import { describe, it, expect } from 'vitest'
import {
  generateOrganisationSlug,
  ORGANISATION_TYPE_LABELS,
  OrganisationName,
  parseOrganisationType,
} from './organisation'

describe('Organisation entity', () => {
  it('derives the slug from the name', () => {
    expect(generateOrganisationSlug('Association pour la taxation des transactions')).toBe(
      'association-pour-la-taxation-des-transactions',
    )
  })

  it('takes a name of 2 to 150 characters', () => {
    expect(() => OrganisationName.make('A')).toThrow()
    expect(() => OrganisationName.make('A'.repeat(151))).toThrow()
    expect(OrganisationName.make('Attac')).toBe('Attac')
  })

  describe('parseOrganisationType', () => {
    it('accepts every known type', () => {
      for (const type of Object.keys(ORGANISATION_TYPE_LABELS)) {
        expect(parseOrganisationType(type)).toBe(type)
      }
    })

    it('returns null for an unknown type', () => {
      expect(parseOrganisationType('cult')).toBeNull()
      expect(parseOrganisationType(undefined)).toBeNull()
    })
  })
})
