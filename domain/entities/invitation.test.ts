import { describe, it, expect } from 'vitest'
import { createInvitation, isExpired } from './invitation'

describe('Invitation entity', () => {
  const baseParams = {
    inviterId: 'inviter-uuid',
    inviteeEmail: 'test@example.com',
    inviteeName: 'Jean Dupont',
  }

  describe('createInvitation', () => {
    it('should create an invitation with status pending', () => {
      const invitation = createInvitation(baseParams)

      expect(invitation.status).toBe('pending')
      expect(invitation.inviterId).toBe('inviter-uuid')
      expect(invitation.inviteeEmail).toBe('test@example.com')
      expect(invitation.inviteeName).toBe('Jean Dupont')
      expect(invitation.inviteeId).toBeUndefined()
      expect(invitation.id).toBeDefined()
      expect(invitation.createdAt).toBeInstanceOf(Date)
    })
  })

  describe('isExpired', () => {
    it('should return false for a recent invitation', () => {
      const invitation = createInvitation(baseParams)

      expect(isExpired(invitation)).toBe(false)
    })

    it('should return true after 7 days', () => {
      const invitation = createInvitation(baseParams)
      const eightDaysAgo = new Date()
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)
      const expiredInvitation = { ...invitation, createdAt: eightDaysAgo }

      expect(isExpired(expiredInvitation)).toBe(true)
    })

    it('should return false for accepted invitations even if old', () => {
      const invitation = createInvitation(baseParams)
      const eightDaysAgo = new Date()
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)
      const accepted = { ...invitation, createdAt: eightDaysAgo, status: 'accepted' as const }

      expect(isExpired(accepted)).toBe(false)
    })
  })
})
