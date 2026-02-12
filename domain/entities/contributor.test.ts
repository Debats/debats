import { describe, it, expect } from 'vitest'
import {
  ContributorId,
  createContributor,
  canCreateSubject,
  canEdit,
  addReputation,
  MIN_REPUTATION_CREATE_SUBJECT,
  MIN_REPUTATION_EDIT,
} from './contributor'

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

    it('should reject negative values', () => {
      expect(() =>
        createContributor({
          id: '550e8400-e29b-41d4-a716-446655440000',
          reputation: -1,
        }),
      ).toThrow()
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

  describe('canCreateSubject', () => {
    it('should return false when reputation is below threshold', () => {
      const contributor = createContributor({
        id: '550e8400-e29b-41d4-a716-446655440000',
        reputation: MIN_REPUTATION_CREATE_SUBJECT - 1,
      })

      expect(canCreateSubject(contributor)).toBe(false)
    })

    it('should return true when reputation meets threshold', () => {
      const contributor = createContributor({
        id: '550e8400-e29b-41d4-a716-446655440000',
        reputation: MIN_REPUTATION_CREATE_SUBJECT,
      })

      expect(canCreateSubject(contributor)).toBe(true)
    })
  })

  describe('canEdit', () => {
    it('should return false when reputation is below threshold', () => {
      const contributor = createContributor({
        id: '550e8400-e29b-41d4-a716-446655440000',
        reputation: MIN_REPUTATION_EDIT - 1,
      })

      expect(canEdit(contributor)).toBe(false)
    })

    it('should return true when reputation meets threshold', () => {
      const contributor = createContributor({
        id: '550e8400-e29b-41d4-a716-446655440000',
        reputation: MIN_REPUTATION_EDIT,
      })

      expect(canEdit(contributor)).toBe(true)
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

    it('should not decrease reputation below 0', () => {
      const contributor = createContributor({
        id: '550e8400-e29b-41d4-a716-446655440000',
        reputation: 10,
      })

      const updated = addReputation(contributor, -20)

      expect(updated.reputation).toBe(0)
    })
  })
})
