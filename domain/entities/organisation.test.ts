import { describe, it, expect } from 'vitest'
import { Option } from 'effect'
import {
  createOrganisation,
  ORGANISATION_TYPE_LABELS,
  parseOrganisationType,
  updateOrganisation,
} from './organisation'

const validParams = {
  name: 'Association pour la taxation des transactions financières',
  acronym: 'Attac',
  organisationType: 'association' as const,
  presentation: 'Mouvement altermondialiste créé en 1998.',
  createdBy: 'user-123',
}

describe('Organisation entity', () => {
  describe('createOrganisation', () => {
    it('creates an organisation with a slug derived from its name', () => {
      const organisation = createOrganisation(validParams)

      expect(organisation.name).toBe(validParams.name)
      expect(organisation.slug).toBe('association-pour-la-taxation-des-transactions-financieres')
      expect(organisation.acronym).toEqual(Option.some('Attac'))
      expect(organisation.organisationType).toBe('association')
      expect(organisation.wikipediaUrl).toEqual(Option.none())
      expect(organisation.websiteUrl).toEqual(Option.none())
      expect(organisation.notorietySources).toEqual([])
      expect(organisation.createdBy).toBe('user-123')
      expect(organisation.updatedBy).toBe('user-123')
      expect(organisation.createdAt).toBeInstanceOf(Date)
    })

    it('stores optional links and notoriety sources', () => {
      const organisation = createOrganisation({
        ...validParams,
        wikipediaUrl: 'https://fr.wikipedia.org/wiki/Attac',
        websiteUrl: 'https://france.attac.org',
        notorietySources: ['https://lemonde.fr/a', 'https://liberation.fr/b'],
      })

      expect(organisation.wikipediaUrl).toEqual(Option.some('https://fr.wikipedia.org/wiki/Attac'))
      expect(organisation.websiteUrl).toEqual(Option.some('https://france.attac.org'))
      expect(organisation.notorietySources).toHaveLength(2)
    })

    it('treats a blank acronym as absent', () => {
      const organisation = createOrganisation({ ...validParams, acronym: '   ' })

      expect(organisation.acronym).toEqual(Option.none())
    })

    it('rejects a name shorter than 2 characters', () => {
      expect(() => createOrganisation({ ...validParams, name: 'A' })).toThrow()
    })

    it('rejects a name longer than 150 characters', () => {
      expect(() => createOrganisation({ ...validParams, name: 'A'.repeat(151) })).toThrow()
    })

    it('rejects a presentation shorter than 10 characters', () => {
      expect(() => createOrganisation({ ...validParams, presentation: 'Court' })).toThrow()
    })
  })

  describe('updateOrganisation', () => {
    it('returns a new organisation with the changed fields and a fresh slug', () => {
      const organisation = createOrganisation(validParams)

      const updated = updateOrganisation(organisation, {
        name: 'Attac France',
        acronym: '',
        organisationType: 'ngo',
        presentation: 'Nouvelle présentation de cette organisation.',
        wikipediaUrl: '',
        websiteUrl: 'https://france.attac.org',
        notorietySources: [],
        updatedBy: 'user-456',
      })

      expect(updated.id).toBe(organisation.id)
      expect(updated.name).toBe('Attac France')
      expect(updated.slug).toBe('attac-france')
      expect(updated.acronym).toEqual(Option.none())
      expect(updated.organisationType).toBe('ngo')
      expect(updated.websiteUrl).toEqual(Option.some('https://france.attac.org'))
      expect(updated.updatedBy).toBe('user-456')
      expect(updated.createdBy).toBe('user-123')
      expect(organisation.name).toBe(validParams.name)
    })
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
