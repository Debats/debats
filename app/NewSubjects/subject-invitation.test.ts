import { describe, expect, it } from 'vitest'
import { subjectInvitation } from './subject-invitation'

describe('subjectInvitation', () => {
  it('offers to add the first statement of a subject nobody spoke on', () => {
    expect(subjectInvitation({ voices: 0 })).toEqual({
      standing: 'Aucune voix recensée',
      call: 'Ajouter la première',
    })
  })

  it('offers to complete a subject somebody spoke on', () => {
    expect(subjectInvitation({ voices: 3 })).toEqual({
      standing: '3 voix recensées',
      call: 'Compléter',
    })
  })

  it('keeps the singular for a single voice', () => {
    expect(subjectInvitation({ voices: 1 }).standing).toBe('1 voix recensée')
  })
})
