import { describe, it, expect } from 'vitest'
import { displayAddress, shareCaption } from './subject-share'

describe('displayAddress', () => {
  it('drops the scheme: an address printed in an image is read, not clicked', () => {
    expect(displayAddress('https://debats.co/s/parcoursup')).toBe('debats.co/s/parcoursup')
  })
})

describe('shareCaption', () => {
  it('names the subject and its question, and ends on the link', () => {
    const caption = shareCaption(
      { title: 'Parcoursup', problem: 'Faut-il supprimer Parcoursup ?' },
      'https://debats.co/s/parcoursup',
    )

    expect(caption).toBe(
      [
        'Parcoursup : qui pense quoi ?',
        'Faut-il supprimer Parcoursup ?',
        '',
        'Des citations datées et sourcées, à lire et à compléter sur Débats.co :',
        'https://debats.co/s/parcoursup',
      ].join('\n'),
    )
  })
})
