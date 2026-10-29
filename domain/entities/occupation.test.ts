import { describe, it, expect } from 'vitest'
import { generateOccupationSlug, OccupationName, sameOccupationName } from './occupation'

describe('OccupationName', () => {
  it('refuses a name under two characters', () => {
    expect(() => OccupationName.make('A')).toThrow()
    expect(OccupationName.make('Député·e')).toBe('Député·e')
  })
})

describe('generateOccupationSlug', () => {
  it('strips accents, apostrophes and inclusive dots', () => {
    expect(generateOccupationSlug("Chef·fe d'entreprise")).toBe('chef-fe-d-entreprise')
    expect(generateOccupationSlug('Député·e')).toBe('depute-e')
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
