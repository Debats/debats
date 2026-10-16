import { describe, it, expect } from 'vitest'
import { groupOccupationsByFamily } from './occupations'
import { createOccupation } from '../entities/occupation'
import { createOccupationFamily } from '../entities/occupation-family'

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
