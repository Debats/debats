import { describe, it, expect } from 'vitest'
import { createOccupation, generateOccupationSlug } from './occupation'

describe('createOccupation', () => {
  it('trims the name, derives the slug and defaults the description', () => {
    const occupation = createOccupation({ name: '  Député·e  ', createdBy: 'founder' })

    expect(occupation.name).toBe('Député·e')
    expect(occupation.slug).toBe('depute-e')
    expect(occupation.description).toBe('')
    expect(occupation.updatedBy).toBe('founder')
  })

  it('refuses a name under two characters', () => {
    expect(() => createOccupation({ name: 'A', createdBy: 'founder' })).toThrow()
  })
})

describe('generateOccupationSlug', () => {
  it('strips accents, apostrophes and inclusive dots', () => {
    expect(generateOccupationSlug("Chef·fe d'entreprise")).toBe('chef-fe-d-entreprise')
  })
})
