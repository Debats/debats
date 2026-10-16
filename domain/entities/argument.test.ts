import { describe, it, expect } from 'vitest'
import { createArgument, sameArgumentTitle } from './argument'

const valid = {
  subjectId: 'subject-1',
  title: 'Coût pour les finances publiques',
  description: 'La mesure pèserait durablement sur le budget de l’État.',
  createdBy: 'user-1',
}

describe('Argument entity', () => {
  it('creates an argument on a subject, trimmed, with audit fields', () => {
    const argument = createArgument({ ...valid, title: '  Coût pour les finances publiques ' })

    expect(argument.subjectId).toBe('subject-1')
    expect(argument.title).toBe('Coût pour les finances publiques')
    expect(argument.createdBy).toBe('user-1')
    expect(argument.updatedBy).toBe('user-1')
    expect(argument.createdAt).toBeInstanceOf(Date)
  })

  it('rejects a title shorter than 3 characters', () => {
    expect(() => createArgument({ ...valid, title: 'Ok' })).toThrow()
  })

  it('rejects a description shorter than 10 characters', () => {
    expect(() => createArgument({ ...valid, description: 'Court' })).toThrow()
  })

  it('considers titles equal regardless of case and surrounding spaces', () => {
    expect(sameArgumentTitle('Coût budgétaire', '  coût BUDGÉTAIRE ')).toBe(true)
    expect(sameArgumentTitle('Coût budgétaire', 'Coût social')).toBe(false)
  })
})
