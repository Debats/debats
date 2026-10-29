import { describe, it, expect } from 'vitest'
import { groupOccupationsByFamily, sortOccupationsHeld } from './occupations'
import { createOccupation, createOccupationFamily } from '../entities/entity-test-helpers'

describe('groupOccupationsByFamily', () => {
  it('orders families by position and their occupations by name, keeping empty families', () => {
    const executive = createOccupationFamily({ name: 'Exécutif', position: 1, createdBy: 'f' })
    const elected = createOccupationFamily({ name: 'Élu·e', position: 2, createdBy: 'f' })
    const health = createOccupationFamily({ name: 'Santé', position: 3, createdBy: 'f' })
    const minister = createOccupation({ name: 'Ministre', familyId: executive.id, createdBy: 'f' })
    const president = createOccupation({
      name: 'Président·e',
      familyId: executive.id,
      createdBy: 'f',
    })
    const deputy = createOccupation({ name: 'Député·e', familyId: elected.id, createdBy: 'f' })

    const groups = groupOccupationsByFamily(
      [health, elected, executive],
      [deputy, president, minister],
    )

    expect(groups.map((g) => g.family.name)).toEqual(['Exécutif', 'Élu·e', 'Santé'])
    expect(groups[0].occupations.map((o) => o.name)).toEqual(['Ministre', 'Président·e'])
    expect(groups[2].occupations).toEqual([])
  })
})

describe('sortOccupationsHeld', () => {
  it('puts the current occupations before the former ones, each by name', () => {
    const family = createOccupationFamily({ name: 'Élu·e', position: 1, createdBy: 'f' })
    const held = (name: string, current: boolean) => ({
      occupation: createOccupation({ name, familyId: family.id, createdBy: 'f' }),
      current,
    })

    const sorted = sortOccupationsHeld([
      held('Sénateur·rice', false),
      held('Maire', true),
      held('Député·e', false),
      held('Chef·fe de parti', true),
    ])

    expect(sorted.map((h) => [h.occupation.name, h.current])).toEqual([
      ['Chef·fe de parti', true],
      ['Maire', true],
      ['Député·e', false],
      ['Sénateur·rice', false],
    ])
  })
})
