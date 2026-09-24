import { describe, it, expect } from 'vitest'
import { createMembership } from '../../../../domain/entities/organisation-membership'
import { membershipPeriodLabel } from './period'

const base = { organisationId: 'org', publicFigureId: 'figure', createdBy: 'user' }

describe('membershipPeriodLabel', () => {
  it('is empty when no date is known', () => {
    expect(membershipPeriodLabel(createMembership(base))).toBe('')
  })

  it('reads « depuis » with a start date only', () => {
    const membership = createMembership({ ...base, startedOn: new Date('2020-03-15') })

    expect(membershipPeriodLabel(membership)).toBe('depuis mars 2020')
  })

  it('reads « jusqu’en » with an end date only', () => {
    const membership = createMembership({ ...base, endedOn: new Date('2020-06-30') })

    expect(membershipPeriodLabel(membership)).toBe('jusqu’en juin 2020')
  })

  it('joins both dates with a dash', () => {
    const membership = createMembership({
      ...base,
      startedOn: new Date('2015-03-01'),
      endedOn: new Date('2020-06-30'),
    })

    expect(membershipPeriodLabel(membership)).toBe('mars 2015 – juin 2020')
  })
})
