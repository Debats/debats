import { describe, it, expect } from 'vitest'
import { confirmersLine, isReviewedEntity, markLabel, markOf, UNREVIEWED, viewerOf } from './review'

const mark = (overrides: Partial<typeof UNREVIEWED>) => ({ ...UNREVIEWED, ...overrides })

describe('markOf', () => {
  it('is the mark of an entity nobody reviewed when the read side holds none', () => {
    expect(markOf({}, 'statement-1')).toEqual(UNREVIEWED)
  })
})

describe('isReviewedEntity', () => {
  const id = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'

  it('holds for one of the six kinds with an id that is one, and for nothing else', () => {
    expect(isReviewedEntity({ type: 'statement', id })).toBe(true)
    expect(isReviewedEntity({ type: 'theme', id })).toBe(false)
    expect(isReviewedEntity({ type: 'statement', id: 'statements; drop' })).toBe(false)
    expect(isReviewedEntity(null)).toBe(false)
  })
})

describe('viewerOf', () => {
  it('tells a visitor from a reader, and a reader from who may settle flags', () => {
    expect(viewerOf(null)).toBe('visitor')
    expect(viewerOf({ reputation: 0 })).toBe('reader')
    expect(viewerOf({ reputation: 9999 })).toBe('reader')
    expect(viewerOf({ reputation: 10000 })).toBe('moderator')
  })
})

describe('markLabel', () => {
  it('says an entity nobody confirmed is not checked yet, agreeing with what it is', () => {
    expect(markLabel('statement', UNREVIEWED)).toBe('Pas encore vérifiée')
    expect(markLabel('subject', UNREVIEWED)).toBe('Pas encore vérifié')
  })

  it('counts the readers who confirmed', () => {
    expect(markLabel('statement', mark({ confirmations: 1 }))).toBe('Confirmée par 1 lecteur·rice')
    expect(markLabel('argument', mark({ confirmations: 12 }))).toBe('Confirmé par 12 lecteur·rices')
  })

  it('names the viewer among them', () => {
    expect(markLabel('statement', mark({ confirmations: 1, confirmedByViewer: true }))).toBe(
      'Confirmée par vous',
    )
    expect(markLabel('statement', mark({ confirmations: 13, confirmedByViewer: true }))).toBe(
      'Confirmée par vous et 12 autres',
    )
    expect(markLabel('statement', mark({ confirmations: 2, confirmedByViewer: true }))).toBe(
      'Confirmée par vous et 1 autre',
    )
  })

  it('adds the flags that are open', () => {
    expect(markLabel('statement', mark({ confirmations: 4, openFlags: 1 }))).toBe(
      'Confirmée par 4 lecteur·rices, 1 signalement en cours',
    )
    expect(markLabel('statement', mark({ openFlags: 2 }))).toBe(
      'Pas encore vérifiée, 2 signalements en cours',
    )
  })
})

describe('confirmersLine', () => {
  it('names the readers it knows, then counts the others', () => {
    expect(confirmersLine(['Nadia B.'], 1)).toBe('Nadia B.')
    expect(confirmersLine(['Nadia B.', 'Sacha L.'], 2)).toBe('Nadia B. et Sacha L.')
    expect(confirmersLine(['Nadia B.', 'Sacha L.'], 4)).toBe('Nadia B., Sacha L. et 2 autres')
    expect(confirmersLine(['Nadia B.', 'Sacha L.'], 3)).toBe('Nadia B., Sacha L. et 1 autre')
  })

  it('only counts when no reader gave a name', () => {
    expect(confirmersLine([], 1)).toBe('1 lecteur·rice')
    expect(confirmersLine([], 5)).toBe('5 lecteur·rices')
  })
})
