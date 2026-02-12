import { describe, it, expect } from 'vitest'
import {
  Rank,
  getRank,
  canPerform,
  reputationReward,
  Action,
  RewardableAction,
} from './permissions'

describe('Reputation System', () => {
  describe('getRank', () => {
    it('should return Sophiste for negative reputation', () => {
      expect(getRank(-100)).toBe(Rank.Sophiste)
    })

    it('should return Meteque for 0 reputation', () => {
      expect(getRank(0)).toBe(Rank.Meteque)
    })

    it('should return Meteque for reputation below Eloquent threshold', () => {
      expect(getRank(999)).toBe(Rank.Meteque)
    })

    it('should return Eloquent at 1000 reputation', () => {
      expect(getRank(1000)).toBe(Rank.Eloquent)
    })

    it('should return Eloquent for reputation below Idealiste threshold', () => {
      expect(getRank(9999)).toBe(Rank.Eloquent)
    })

    it('should return Idealiste at 10000 reputation', () => {
      expect(getRank(10000)).toBe(Rank.Idealiste)
    })

    it('should return Idealiste for reputation below Fondateur threshold', () => {
      expect(getRank(999999)).toBe(Rank.Idealiste)
    })

    it('should return Fondateur at 1000000 reputation', () => {
      expect(getRank(1000000)).toBe(Rank.Fondateur)
    })
  })

  describe('canPerform', () => {
    describe('actions available to Sophiste and Meteque (new users)', () => {
      const newUserActions: Action[] = [
        'add_statement',
        'add_evidence',
        'add_position',
      ]

      for (const action of newUserActions) {
        it(`should allow ${action} for Sophiste (-400)`, () => {
          expect(canPerform(-400, action)).toBe(true)
        })

        it(`should allow ${action} for Meteque (0)`, () => {
          expect(canPerform(0, action)).toBe(true)
        })
      }
    })

    describe('actions requiring Eloquent rank (1000+)', () => {
      const eloquentActions: Action[] = [
        'add_argument',
        'add_subject',
        'add_personality',
        'approve_subject',
        'approve_personality',
        'approve_evidence',
        'approve_argument',
        'approve_position',
        'reject_subject',
        'reject_personality',
        'reject_evidence',
        'reject_argument',
        'reject_position',
      ]

      for (const action of eloquentActions) {
        it(`should deny ${action} for Meteque (999)`, () => {
          expect(canPerform(999, action)).toBe(false)
        })

        it(`should allow ${action} for Eloquent (1000)`, () => {
          expect(canPerform(1000, action)).toBe(true)
        })
      }
    })

    describe('actions requiring Idealiste rank (10000+)', () => {
      const idealisteActions: Action[] = [
        'delete_minor_subject',
        'delete_minor_personality',
        'delete_evidence',
        'delete_argument',
        'delete_position',
        'edit_argument',
        'edit_subject',
        'edit_personality',
      ]

      for (const action of idealisteActions) {
        it(`should deny ${action} for Eloquent (9999)`, () => {
          expect(canPerform(9999, action)).toBe(false)
        })

        it(`should allow ${action} for Idealiste (10000)`, () => {
          expect(canPerform(10000, action)).toBe(true)
        })
      }
    })

    describe('actions requiring Fondateur rank (1000000+)', () => {
      const fondateurActions: Action[] = [
        'delete_major_subject',
        'delete_major_personality',
      ]

      for (const action of fondateurActions) {
        it(`should deny ${action} for Idealiste (999999)`, () => {
          expect(canPerform(999999, action)).toBe(false)
        })

        it(`should allow ${action} for Fondateur (1000000)`, () => {
          expect(canPerform(1000000, action)).toBe(true)
        })
      }
    })
  })

  describe('reputationReward', () => {
    it('should return 5 for signed_up', () => {
      expect(reputationReward('signed_up')).toBe(5)
    })

    it('should return 50 for added_subject', () => {
      expect(reputationReward('added_subject')).toBe(50)
    })

    it('should return 200 for added_subject_validated', () => {
      expect(reputationReward('added_subject_validated')).toBe(200)
    })

    it('should return 5 for edited_subject', () => {
      expect(reputationReward('edited_subject')).toBe(5)
    })

    it('should return 50 for added_statement_validated', () => {
      expect(reputationReward('added_statement_validated')).toBe(50)
    })

    it('should return 50 for added_evidence_validated', () => {
      expect(reputationReward('added_evidence_validated')).toBe(50)
    })

    it('should return 1 for linked_argument_to_statement', () => {
      expect(reputationReward('linked_argument_to_statement')).toBe(1)
    })

    it('should return -1000 for subject_rejected_spam', () => {
      expect(reputationReward('subject_rejected_spam')).toBe(-1000)
    })

    it('should return -100 for subject_rejected_duplicate', () => {
      expect(reputationReward('subject_rejected_duplicate')).toBe(-100)
    })

    it('should return -100 for statement_rejected', () => {
      expect(reputationReward('statement_rejected')).toBe(-100)
    })
  })
})
