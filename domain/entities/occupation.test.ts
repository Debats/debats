import { describe, it, expect } from 'vitest'
import { createOccupation, generateOccupationSlug, sameOccupationName } from './occupation'
import { createOccupationFamily } from './occupation-family'

describe('createOccupation', () => {
  it('trims the name, derives the slug and defaults the description', () => {
    const occupation = createOccupation({
      name: '  Député·e  ',
      familyId: 'family',
      createdBy: 'founder',
    })

    expect(occupation.name).toBe('Député·e')
    expect(occupation.slug).toBe('depute-e')
    expect(occupation.familyId).toBe('family')
    expect(occupation.description).toBe('')
    expect(occupation.updatedBy).toBe('founder')
  })

  it('refuses a name under two characters', () => {
    expect(() =>
      createOccupation({ name: 'A', familyId: 'family', createdBy: 'founder' }),
    ).toThrow()
  })
})

describe('createOccupationFamily', () => {
  it('keeps the display position', () => {
    const family = createOccupationFamily({ name: 'Exécutif', position: 1, createdBy: 'founder' })

    expect(family.slug).toBe('executif')
    expect(family.position).toBe(1)
  })
})

describe('generateOccupationSlug', () => {
  it('strips accents, apostrophes and inclusive dots', () => {
    expect(generateOccupationSlug("Chef·fe d'entreprise")).toBe('chef-fe-d-entreprise')
  })
})

describe('sameOccupationName', () => {
  it('matches the listed name itself', () => {
    expect(sameOccupationName('Député·e', 'Député·e')).toBe(true)
  })

  it('ignores case and accents', () => {
    expect(sameOccupationName('ECONOMISTE', 'Économiste')).toBe(true)
  })

  it('accepts a name written without its inclusive suffix', () => {
    expect(sameOccupationName('Député', 'Député·e')).toBe(true)
    expect(sameOccupationName('Premier ministre', 'Premier·ère ministre')).toBe(true)
    expect(sameOccupationName('Conseiller municipal', 'Conseiller·ère municipal·e')).toBe(true)
  })

  it('refuses a feminine form the listed name does not spell out', () => {
    expect(sameOccupationName('Sénatrice', 'Sénateur·rice')).toBe(false)
  })

  it('refuses a different occupation', () => {
    expect(sameOccupationName('Sociologue', 'Économiste')).toBe(false)
    expect(sameOccupationName('Ministre', 'Premier·ère ministre')).toBe(false)
  })
})
