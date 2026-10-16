import { describe, it, expect } from 'vitest'
import { createOccupation, generateOccupationSlug } from './occupation'
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
