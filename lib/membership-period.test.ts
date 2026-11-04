import { describe, it, expect } from 'vitest'
import { createMembership } from '../domain/entities/entity-test-helpers'
import { membershipPeriodLabel } from './membership-period'

const base = { organisationId: 'org', publicFigureId: 'figure', createdBy: 'user' }
const today = new Date('2026-11-05T14:00:00Z')

describe('membershipPeriodLabel', () => {
  it('is empty when no date is known', () => {
    expect(membershipPeriodLabel(createMembership(base), today)).toBe('')
  })

  it('reads « depuis » with a start date only', () => {
    const membership = createMembership({ ...base, startedOn: new Date('2020-03-15') })

    expect(membershipPeriodLabel(membership, today)).toBe('depuis mars 2020')
  })

  it('reads « à partir de » for an affiliation that has not begun yet', () => {
    const membership = createMembership({ ...base, startedOn: new Date('2027-01-01') })

    expect(membershipPeriodLabel(membership, today)).toBe('à partir de janvier 2027')
  })

  it('elides before a month that opens on a vowel', () => {
    const membership = createMembership({ ...base, startedOn: new Date('2027-04-01') })

    expect(membershipPeriodLabel(membership, today)).toBe('à partir d’avril 2027')
  })

  it('still reads « depuis » on the very day the affiliation begins', () => {
    const membership = createMembership({ ...base, startedOn: new Date('2026-11-05') })

    expect(membershipPeriodLabel(membership, today)).toBe('depuis novembre 2026')
  })

  it('reads « jusqu’en » with an end date only', () => {
    const membership = createMembership({ ...base, endedOn: new Date('2020-06-30') })

    expect(membershipPeriodLabel(membership, today)).toBe('jusqu’en juin 2020')
  })

  it('joins both dates with a dash', () => {
    const membership = createMembership({
      ...base,
      startedOn: new Date('2015-03-01'),
      endedOn: new Date('2020-06-30'),
    })

    expect(membershipPeriodLabel(membership, today)).toBe('mars 2015 – juin 2020')
  })
})
