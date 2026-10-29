import { describe, it, expect } from 'vitest'
import { createSubject } from './entity-test-helpers'
import { isMajorSubject, generateSlug } from './subject'

describe('generateSlug', () => {
  it('generates proper slugs from various inputs', () => {
    expect(generateSlug('Simple Title')).toBe('simple-title')
    expect(generateSlug('Title with Multiple    Spaces')).toBe('title-with-multiple-spaces')
    expect(generateSlug('Àccénts & Spéciàl Chärs!')).toBe('accents-special-chars')
    expect(generateSlug('123 Numbers & Symbols @#$')).toBe('123-numbers-symbols')
    expect(generateSlug('Écologie & Développement Durable')).toBe('ecologie-developpement-durable')
  })

  it('handles edge cases', () => {
    expect(generateSlug('   Leading and trailing   ')).toBe('leading-and-trailing')
    expect(generateSlug('Multiple---Dashes')).toBe('multiple-dashes')
  })
})

describe('isMajorSubject', () => {
  const today = new Date('2026-10-29')
  const subject = createSubject({
    title: 'Le montant du SMIC',
    presentation: 'Test presentation with minimum length',
    problem: 'Test problem with minimum length',
  })
  const createdOn = (day: string) => ({ ...subject, createdAt: new Date(day) })

  it('is major while less than a week old', () => {
    expect(isMajorSubject(createdOn('2026-10-25'), 0, today)).toBe(true)
  })

  it('is major once it has more than five statements', () => {
    expect(isMajorSubject(createdOn('2020-01-01'), 6, today)).toBe(true)
  })

  it('is minor when old with few statements', () => {
    expect(isMajorSubject(createdOn('2020-01-01'), 2, today)).toBe(false)
  })
})
