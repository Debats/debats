import { describe, expect, it } from 'vitest'
import {
  createMembership,
  createOccupation,
  createOrganisation,
  createPublicFigure,
} from '../entities/entity-test-helpers'
import { publicFigureEnrichmentView } from './public-figure-enrichment'

describe('publicFigureEnrichmentView', () => {
  const figure = createPublicFigure({
    name: 'Sophie Binet',
    presentation: 'Secrétaire générale de la CGT.',
    createdBy: 'founder',
  })
  const cgt = createOrganisation({
    name: 'Confédération générale du travail',
    acronym: 'CGT',
    organisationType: 'union',
    presentation: 'Confédération syndicale de salariés.',
    createdBy: 'founder',
  })

  it('tells the figure by its slug, with the occupations held and the affiliations, dates as days', () => {
    const syndicaliste = createOccupation({
      name: 'Syndicaliste',
      familyId: 'f',
      createdBy: 'founder',
    })
    const membership = createMembership({
      organisationId: cgt.id,
      publicFigureId: figure.id,
      role: 'secrétaire générale',
      startedOn: new Date('2023-03-31'),
      createdBy: 'founder',
    })

    const view = publicFigureEnrichmentView(
      figure,
      [{ occupation: syndicaliste, current: true }],
      [
        {
          membership,
          organisation: {
            id: cgt.id,
            name: cgt.name,
            slug: cgt.slug,
            acronym: 'CGT',
            organisationType: 'union',
          },
        },
      ],
    )

    expect(view).toEqual({
      id: figure.id,
      slug: 'sophie-binet',
      name: 'Sophie Binet',
      occupations: [{ slug: syndicaliste.slug, name: 'Syndicaliste', current: true }],
      affiliations: [
        {
          id: membership.id,
          organisation: { slug: cgt.slug, name: cgt.name, acronym: 'CGT' },
          role: 'secrétaire générale',
          startedOn: '2023-03-31',
          endedOn: null,
        },
      ],
    })
  })

  it('leaves a role and a period unset as null', () => {
    const membership = createMembership({
      organisationId: cgt.id,
      publicFigureId: figure.id,
      createdBy: 'founder',
    })

    const view = publicFigureEnrichmentView(
      figure,
      [],
      [
        {
          membership,
          organisation: {
            id: cgt.id,
            name: cgt.name,
            slug: cgt.slug,
            acronym: null,
            organisationType: 'union',
          },
        },
      ],
    )

    expect(view.affiliations[0]).toMatchObject({ role: null, startedOn: null, endedOn: null })
    expect(view.affiliations[0].organisation.acronym).toBeNull()
  })
})
