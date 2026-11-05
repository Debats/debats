import { describe, it, expect } from 'vitest'
import { createOccupation, createOccupationFamily } from '../entities/entity-test-helpers'
import { occupationFamilyGroups, organisationGroups } from './author-groups'

describe('organisationGroups', () => {
  it('names a group after the acronym when there is one, and keys it on the members', () => {
    const [group] = organisationGroups([
      {
        id: 'pcf',
        name: 'Parti communiste français',
        slug: 'pcf',
        acronym: 'PCF',
        memberIds: ['a', 'b'],
      },
    ])
    expect(group.label).toBe('Membres de PCF')
    expect(group.href).toBe('/o/pcf')
    expect(group.members).toEqual(new Set(['public_figure-a', 'public_figure-b']))
  })

  it('falls back on the full name without an acronym', () => {
    const [group] = organisationGroups([
      { id: 'attac', name: 'Attac', slug: 'attac', acronym: null, memberIds: [] },
    ])
    expect(group.label).toBe('Membres de Attac')
  })
})

describe('occupationFamilyGroups', () => {
  const executif = createOccupationFamily({ name: 'Exécutif', position: 1, createdBy: 'user' })
  const elus = createOccupationFamily({ name: 'Élu·e national·e', position: 2, createdBy: 'user' })
  const ministre = createOccupation({ name: 'Ministre', familyId: executif.id, createdBy: 'user' })
  const depute = createOccupation({ name: 'Député·e', familyId: elus.id, createdBy: 'user' })
  const families = [executif, elus]
  const occupations = [ministre, depute]

  it('keeps only the families the author belongs to', () => {
    const groups = occupationFamilyGroups(
      'elle',
      families,
      [
        { publicFigureId: 'elle', occupationId: ministre.id },
        { publicFigureId: 'autre', occupationId: depute.id },
      ],
      occupations,
    )
    expect(groups.map((group) => group.label)).toEqual(['Exécutif'])
  })

  it('gathers everyone of the family, the author included', () => {
    const [group] = occupationFamilyGroups(
      'elle',
      families,
      [
        { publicFigureId: 'elle', occupationId: ministre.id },
        { publicFigureId: 'autre', occupationId: ministre.id },
      ],
      occupations,
    )
    expect(group.members).toEqual(new Set(['public_figure-elle', 'public_figure-autre']))
  })

  it('gives one group per family when the author holds several occupations', () => {
    const groups = occupationFamilyGroups(
      'elle',
      families,
      [
        { publicFigureId: 'elle', occupationId: ministre.id },
        { publicFigureId: 'elle', occupationId: depute.id },
      ],
      occupations,
    )
    expect(groups.map((group) => group.label)).toEqual(['Exécutif', 'Élu·e national·e'])
  })

  it('gives nothing when the author has no occupation', () => {
    expect(
      occupationFamilyGroups(
        'elle',
        families,
        [{ publicFigureId: 'autre', occupationId: ministre.id }],
        occupations,
      ),
    ).toEqual([])
  })
})
