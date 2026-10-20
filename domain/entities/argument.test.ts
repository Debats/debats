import { describe, it, expect } from 'vitest'
import { createArgument, sameArgumentTitle } from './argument'

const valid = {
  title: 'Coût pour les finances publiques',
  description: 'La mesure pèserait durablement sur le budget de l’État.',
  createdBy: 'user-1',
}

describe('Argument entity', () => {
  it('creates a global argument with a slug and audit fields', () => {
    const argument = createArgument({ ...valid, title: '  Coût pour les finances publiques ' })

    expect(argument.title).toBe('Coût pour les finances publiques')
    expect(argument.slug).toBe('cout-pour-les-finances-publiques')
    expect(argument.description).toBe(valid.description)
    expect(argument.createdBy).toBe('user-1')
    expect(argument.updatedBy).toBe('user-1')
  })

  it('accepts a missing description', () => {
    expect(createArgument({ title: 'Liberté de choix', createdBy: 'user-1' }).description).toBe('')
  })

  it('rejects a title shorter than 3 characters', () => {
    expect(() => createArgument({ ...valid, title: 'Ok' })).toThrow()
  })

  it('considers titles equal regardless of case and surrounding spaces', () => {
    expect(sameArgumentTitle('Coût budgétaire', '  coût BUDGÉTAIRE ')).toBe(true)
    expect(sameArgumentTitle('Coût budgétaire', 'Coût social')).toBe(false)
  })
})
