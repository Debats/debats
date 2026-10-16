import { describe, it, expect } from 'vitest'
import { createArgument, renameArgument, sameArgumentTitle } from './argument'

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

  it('renames an argument, keeping its identity and moving its slug', () => {
    const argument = createArgument(valid)
    const renamed = renameArgument(argument, {
      title: 'Coût budgétaire',
      description: '',
      updatedBy: 'user-2',
    })

    expect(renamed.id).toBe(argument.id)
    expect(renamed.title).toBe('Coût budgétaire')
    expect(renamed.slug).toBe('cout-budgetaire')
    expect(renamed.updatedBy).toBe('user-2')
    expect(renamed.createdBy).toBe('user-1')
  })

  it('considers titles equal regardless of case and surrounding spaces', () => {
    expect(sameArgumentTitle('Coût budgétaire', '  coût BUDGÉTAIRE ')).toBe(true)
    expect(sameArgumentTitle('Coût budgétaire', 'Coût social')).toBe(false)
  })
})
