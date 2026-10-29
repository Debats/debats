import { describe, it, expect } from 'vitest'
import { createOccupation } from '../entities/entity-test-helpers'
import { publicFigureRef, organisationRef } from './statement-author'
import { roleOf, rolesByFigure } from './author-role'

const occupation = (name: string) =>
  createOccupation({ name, familyId: 'family-1', description: '', createdBy: 'f' })

describe('rolesByFigure', () => {
  it('names each figure by the occupations she holds, in alphabetical order', () => {
    const roles = rolesByFigure([
      { publicFigureId: 'macron', occupation: occupation('Président·e de la République') },
      { publicFigureId: 'attal', occupation: occupation('Ministre') },
      { publicFigureId: 'attal', occupation: occupation('Député·e') },
    ])

    expect(roles.get('macron')).toBe('Président·e de la République')
    expect(roles.get('attal')).toBe('Député·e · Ministre')
  })

  it('has nothing to say about an organisation or a figure without occupation', () => {
    const roles = rolesByFigure([])
    expect(roleOf(publicFigureRef({ id: 'x', name: 'X', slug: 'x' }), roles)).toBeUndefined()
    expect(
      roleOf(organisationRef({ id: 'o', name: 'O', slug: 'o', acronym: null }), roles),
    ).toBeUndefined()
  })
})
