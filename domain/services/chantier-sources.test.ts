import { describe, expect, it } from 'vitest'
import { SOURCE_NOTE_MAX_LENGTH, SOURCES_PER_CALL_MAX, parseNotedSources } from './chantier-sources'

const source = (url: string, note = 'Tribune des signataires, liste complète en bas de page.') => ({
  url,
  note,
})

describe('parseNotedSources', () => {
  it('takes the pages the agent notes, each with its address and what it holds', () => {
    expect(
      parseNotedSources({
        sources: [source('https://www.lemonde.fr/tribune'), source('http://senat.fr/seance')],
      }),
    ).toEqual({
      sources: [source('https://www.lemonde.fr/tribune'), source('http://senat.fr/seance')],
    })
  })

  it('trims what surrounds an address and a note', () => {
    expect(
      parseNotedSources({ sources: [{ url: ' https://senat.fr/a ', note: '  Compte rendu. ' }] }),
    ).toEqual({ sources: [{ url: 'https://senat.fr/a', note: 'Compte rendu.' }] })
  })

  it('keeps the last note when an address is noted twice in one call', () => {
    expect(
      parseNotedSources({
        sources: [source('https://senat.fr/a', 'Première lecture.'), source('https://senat.fr/a')],
      }),
    ).toEqual({ sources: [source('https://senat.fr/a')] })
  })

  it('refuses what is not a list of sources, an empty one, or too many at once', () => {
    expect(parseNotedSources(null)).toHaveProperty('error')
    expect(parseNotedSources({})).toHaveProperty('error')
    expect(parseNotedSources({ sources: 'https://senat.fr' })).toHaveProperty('error')
    expect(parseNotedSources({ sources: [] })).toHaveProperty('error')
    expect(
      parseNotedSources({
        sources: Array.from({ length: SOURCES_PER_CALL_MAX + 1 }, (_, i) =>
          source(`https://senat.fr/${i}`),
        ),
      }),
    ).toHaveProperty('error')
  })

  it('refuses an address that is not a web page', () => {
    expect(parseNotedSources({ sources: [source('senat.fr/a')] })).toHaveProperty('error')
    expect(parseNotedSources({ sources: [source('javascript:alert(1)')] })).toHaveProperty('error')
    expect(parseNotedSources({ sources: [source('file:///tmp/page.html')] })).toHaveProperty(
      'error',
    )
    expect(parseNotedSources({ sources: [{ url: 42, note: 'x' }] })).toHaveProperty('error')
  })

  it('refuses a source without a note, or with one too long to be a note', () => {
    expect(parseNotedSources({ sources: [source('https://senat.fr/a', '  ')] })).toHaveProperty(
      'error',
    )
    expect(parseNotedSources({ sources: [{ url: 'https://senat.fr/a' }] })).toHaveProperty('error')
    expect(
      parseNotedSources({
        sources: [source('https://senat.fr/a', 'x'.repeat(SOURCE_NOTE_MAX_LENGTH + 1))],
      }),
    ).toHaveProperty('error')
    expect(
      parseNotedSources({
        sources: [source('https://senat.fr/a', 'x'.repeat(SOURCE_NOTE_MAX_LENGTH))],
      }),
    ).toHaveProperty('sources')
  })
})
