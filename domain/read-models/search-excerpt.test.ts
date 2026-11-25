import { describe, expect, it } from 'vitest'
import { markedExcerpt } from './search-excerpt'

describe('markedExcerpt', () => {
  it('marks the word searched where the excerpt holds it, whatever its accents and capitals', () => {
    expect(markedExcerpt('La Laïcité à l’école', 'laicite')).toEqual([
      { text: 'La ', found: false },
      { text: 'Laïcité', found: true },
      { text: ' à l’école', found: false },
    ])
  })

  it('marks each word of the query, each time it occurs', () => {
    expect(markedExcerpt('taxer les riches, taxer le capital', 'capital taxer')).toEqual([
      { text: 'taxer', found: true },
      { text: ' les riches, ', found: false },
      { text: 'taxer', found: true },
      { text: ' le ', found: false },
      { text: 'capital', found: true },
    ])
  })

  it('marks once what two words of the query cover together', () => {
    expect(markedExcerpt('le nucléaire', 'nucle cleaire')).toEqual([
      { text: 'le ', found: false },
      { text: 'nucléaire', found: true },
    ])
  })

  it('keeps its place after a letter that folds into two', () => {
    expect(markedExcerpt('un cœur de cible', 'cible')).toEqual([
      { text: 'un cœur de ', found: false },
      { text: 'cible', found: true },
    ])
  })

  it('leaves whole an excerpt that holds none of the words', () => {
    expect(markedExcerpt('Le montant du SMIC', 'retraite')).toEqual([
      { text: 'Le montant du SMIC', found: false },
    ])
  })

  it('reads a query as a text, never as a pattern', () => {
    expect(markedExcerpt('a.b (c)', '(c)')).toEqual([
      { text: 'a.b ', found: false },
      { text: '(c)', found: true },
    ])
  })
})
