import { describe, it, expect } from 'vitest'
import { createMembership } from './entity-test-helpers'
import { isCurrentMembership } from './organisation-membership'

const validParams = {
  organisationId: 'org-1',
  publicFigureId: 'figure-1',
  createdBy: 'user-123',
}

describe('OrganisationMembership entity', () => {
  it('rejects a role longer than 100 characters', () => {
    expect(() => createMembership({ ...validParams, role: 'A'.repeat(101) })).toThrow()
  })

  it('rejects an end date before the start date', () => {
    expect(() =>
      createMembership({
        ...validParams,
        startedOn: new Date('2022-01-01'),
        endedOn: new Date('2021-01-01'),
      }),
    ).toThrow()
  })

  describe('isCurrentMembership', () => {
    const today = new Date('2026-09-24')

    it('is current when there is no end date', () => {
      expect(isCurrentMembership(createMembership(validParams), today)).toBe(true)
    })

    it('is current when the end date is in the future', () => {
      const membership = createMembership({ ...validParams, endedOn: new Date('2030-01-01') })

      expect(isCurrentMembership(membership, today)).toBe(true)
    })

    it('is former when the end date is past', () => {
      const membership = createMembership({ ...validParams, endedOn: new Date('2020-01-01') })

      expect(isCurrentMembership(membership, today)).toBe(false)
    })

    it('runs for the whole day it ends on, and is over the day after', () => {
      // An end date is a day, never an instant: the column is a `date`
      const membership = createMembership({ ...validParams, endedOn: new Date('2026-09-24') })

      expect(isCurrentMembership(membership, new Date('2026-09-24T14:30:00Z'))).toBe(true)
      expect(isCurrentMembership(membership, new Date('2026-09-25T00:00:01Z'))).toBe(false)
    })

    it('counts an affiliation announced for later among the running ones', () => {
      // Nothing is yet to come on this site: a period that has not opened is
      // read as running, rather than filed among the ones that have ended
      const membership = createMembership({ ...validParams, startedOn: new Date('2027-01-01') })

      expect(isCurrentMembership(membership, today)).toBe(true)
    })
  })
})
