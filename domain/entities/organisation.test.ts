import { describe, it, expect } from 'vitest'
import {
  generateOrganisationSlug,
  ORGANISATION_TYPES,
  ORGANISATION_TYPE_LABELS,
  ORGANISATION_TYPE_SLUGS,
  OrganisationName,
  parseOrganisationType,
  parseOrganisationTypeSlug,
  pluralTypeInSentence,
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

  describe('pluralTypeInSentence', () => {
    it('lowercases a plain label', () => {
      expect(pluralTypeInSentence('political_party')).toBe('partis politiques')
      expect(pluralTypeInSentence('business_group')).toBe('groupements économiques')
    })

    it('leaves an acronym its capitals', () => {
      expect(pluralTypeInSentence('ngo')).toBe('ONG')
    })
  })

  describe('parseOrganisationTypeSlug', () => {
    it('names each type in a readable URL', () => {
      expect(ORGANISATION_TYPE_SLUGS.political_party).toBe('partis-politiques')
      expect(ORGANISATION_TYPE_SLUGS.business_group).toBe('groupements-economiques')
    })

    it('reads back the slug of every type', () => {
      for (const type of ORGANISATION_TYPES) {
        expect(parseOrganisationTypeSlug(ORGANISATION_TYPE_SLUGS[type])).toBe(type)
      }
    })

    it('gives each type its own slug', () => {
      const slugs = ORGANISATION_TYPES.map((type) => ORGANISATION_TYPE_SLUGS[type])
      expect(new Set(slugs).size).toBe(ORGANISATION_TYPES.length)
    })

    it('returns null for an unknown slug, and never takes the raw type for one', () => {
      expect(parseOrganisationTypeSlug('sectes')).toBeNull()
      expect(parseOrganisationTypeSlug('political_party')).toBeNull()
    })
  })
})
