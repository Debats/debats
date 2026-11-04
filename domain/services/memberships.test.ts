import { describe, expect, it } from 'vitest'
import { createMembership } from '../entities/entity-test-helpers'
import { splitMemberships } from './memberships'

const today = new Date('2026-11-04')

const affiliation = (label: string, endedOn?: string) => ({
  label,
  membership: createMembership({
    organisationId: 'org-1',
    publicFigureId: 'figure-1',
    endedOn: endedOn ? new Date(endedOn) : undefined,
    createdBy: 'contributor-1',
  }),
})

describe('splitMemberships', () => {
  it('keeps the open-ended memberships on the current side', () => {
    const { current, former } = splitMemberships([affiliation('CGT')], today)

    expect(current.map((a) => a.label)).toEqual(['CGT'])
    expect(former).toEqual([])
  })

  it('moves a membership that has ended to the former side', () => {
    const { current, former } = splitMemberships([affiliation('UDF', '2007-01-01')], today)

    expect(current).toEqual([])
    expect(former.map((a) => a.label)).toEqual(['UDF'])
  })

  it('judges on the day it is given, not on the day it runs', () => {
    const memberships = [affiliation('UDF', '2007-01-01')]

    expect(splitMemberships(memberships, new Date('2006-01-01')).current).toHaveLength(1)
    expect(splitMemberships(memberships, new Date('2008-01-01')).former).toHaveLength(1)
  })

  it('keeps the order it was given on each side', () => {
    const { current, former } = splitMemberships(
      [
        affiliation('CGT'),
        affiliation('UDF', '2007-01-01'),
        affiliation('Attac'),
        affiliation('CDS', '1995-11-25'),
      ],
      today,
    )

    expect(current.map((a) => a.label)).toEqual(['CGT', 'Attac'])
    expect(former.map((a) => a.label)).toEqual(['UDF', 'CDS'])
  })
})
