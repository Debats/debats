import { describe, it, expect } from 'vitest'
import { createInvitation } from './entity-test-helpers'
import { isExpired } from './invitation'

describe('isExpired', () => {
  /** The day the test judges on, and an invitation sent six days before it */
  const today = new Date('2026-03-15T10:00:00Z')
  const sentOn = (day: string) => ({
    ...createInvitation({
      inviterId: 'inviter-uuid',
      inviteeEmail: 'test@example.com',
      inviteeName: 'Jean Dupont',
    }),
    createdAt: new Date(day),
  })

  it('is false for a recent invitation', () => {
    expect(isExpired(sentOn('2026-03-09T10:00:00Z'), today)).toBe(false)
  })

  it('is true after 7 days', () => {
    expect(isExpired(sentOn('2026-03-07T10:00:00Z'), today)).toBe(true)
  })

  it('is false for an accepted invitation, however old', () => {
    const accepted = { ...sentOn('2026-01-01T10:00:00Z'), status: 'accepted' as const }
    expect(isExpired(accepted, today)).toBe(false)
  })
})
