import { describe, it, expect } from 'vitest'
import { ArgumentTitle, generateArgumentSlug, sameArgumentTitle } from './argument'

describe('Argument entity', () => {
  it('derives the slug from the title', () => {
    expect(generateArgumentSlug('Coût pour les finances publiques')).toBe(
      'cout-pour-les-finances-publiques',
    )
  })

  it('rejects a title shorter than 3 characters', () => {
    expect(() => ArgumentTitle.make('Ok')).toThrow()
    expect(ArgumentTitle.make('Oui')).toBe('Oui')
  })

  it('considers titles equal regardless of case and surrounding spaces', () => {
    expect(sameArgumentTitle('Coût budgétaire', '  coût BUDGÉTAIRE ')).toBe(true)
    expect(sameArgumentTitle('Coût budgétaire', 'Coût social')).toBe(false)
  })
})
