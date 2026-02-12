import { describe, it, expect } from 'vitest'
import {
  ContributorId,
  createContributor,
  contributorCanPerform,
  contributorRank,
  addReputation,
} from './contributor'
import { Rank } from '../reputation/permissions'

describe('Contributor Entity', () => {
  describe('ContributorId', () => {
    it('should accept a valid UUID string', () => {
      const id = ContributorId.make('550e8400-e29b-41d4-a716-446655440000')
      expect(id).toBe('550e8400-e29b-41d4-a716-446655440000')
    })
  })

  describe('Reputation', () => {
    it('should default to 0', () => {
      const contributor = createContributor({
        id: '550e8400-e29b-41d4-a716-446655440000',
      })

      expect(contributor.reputation).toBe(0)
    })
  })

  describe('createContributor', () => {
    it('should create a contributor with default reputation of 0', () => {
      const contributor = createContributor({
        id: '550e8400-e29b-41d4-a716-446655440000',
      })

      expect(contributor.id).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(contributor.reputation).toBe(0)
      expect(contributor.createdAt).toBeInstanceOf(Date)
      expect(contributor.updatedAt).toBeInstanceOf(Date)
    })

    it('should create a contributor with a given reputation', () => {
      const contributor = createContributor({
        id: '550e8400-e29b-41d4-a716-446655440000',
        reputation: 100,
      })

      expect(contributor.reputation).toBe(100)
    })
  })

  describe('contributorRank', () => {
    it('should return Métèque for a new contributor', () => {
      const contributor = createContributor({ id: 'abc' })
      expect(contributorRank(contributor)).toBe(Rank.Meteque)
    })

    it('should return Éloquent for a contributor with 1000+ reputation', () => {
      const contributor = createContributor({ id: 'abc', reputation: 1000 })
      expect(contributorRank(contributor)).toBe(Rank.Eloquent)
    })

    it('should return Sophiste for a contributor with negative reputation', () => {
      const contributor = createContributor({ id: 'abc', reputation: -100 })
      expect(contributorRank(contributor)).toBe(Rank.Sophiste)
    })
  })

  describe('contributorCanPerform', () => {
    it('should allow a new contributor to add a statement', () => {
      const contributor = createContributor({ id: 'abc' })
      expect(contributorCanPerform(contributor, 'add_statement')).toBe(true)
    })

    it('should deny a new contributor from adding a subject', () => {
      const contributor = createContributor({ id: 'abc', reputation: 999 })
      expect(contributorCanPerform(contributor, 'add_subject')).toBe(false)
    })

    it('should allow an Éloquent contributor to add a subject', () => {
      const contributor = createContributor({ id: 'abc', reputation: 1000 })
      expect(contributorCanPerform(contributor, 'add_subject')).toBe(true)
    })

    it('should deny an Éloquent contributor from editing a subject', () => {
      const contributor = createContributor({ id: 'abc', reputation: 9999 })
      expect(contributorCanPerform(contributor, 'edit_subject')).toBe(false)
    })

    it('should allow an Idéaliste contributor to edit a subject', () => {
      const contributor = createContributor({ id: 'abc', reputation: 10000 })
      expect(contributorCanPerform(contributor, 'edit_subject')).toBe(true)
    })
  })

  describe('addReputation', () => {
    it('should increase reputation by given amount', () => {
      const contributor = createContributor({
        id: '550e8400-e29b-41d4-a716-446655440000',
        reputation: 10,
      })

      const updated = addReputation(contributor, 25)

      expect(updated.reputation).toBe(35)
      expect(updated.updatedAt).not.toBe(contributor.updatedAt)
    })

    it('should allow negative reputation', () => {
      const contributor = createContributor({
        id: '550e8400-e29b-41d4-a716-446655440000',
        reputation: 10,
      })

      const updated = addReputation(contributor, -20)

      expect(updated.reputation).toBe(-10)
    })
  })
})
