import { describe, it, expect } from 'vitest'
import { createInvitation } from './entity-test-helpers'
import { isExpired } from './invitation'

describe('isExpired', () => {
  const invitation = createInvitation({
    inviterId: 'inviter-uuid',
    inviteeEmail: 'test@example.com',
    inviteeName: 'Jean Dupont',
  })
  const eightDaysAgo = new Date()
  eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)

  it('is false for a recent invitation', () => {
    expect(isExpired(invitation)).toBe(false)
  })

  it('is true after 7 days', () => {
    expect(isExpired({ ...invitation, createdAt: eightDaysAgo })).toBe(true)
  })

  it('is false for an accepted invitation, however old', () => {
    const accepted = { ...invitation, createdAt: eightDaysAgo, status: 'accepted' as const }
    expect(isExpired(accepted)).toBe(false)
  })
})
