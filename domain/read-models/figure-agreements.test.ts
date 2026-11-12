import { describe, expect, it } from 'vitest'
import { FigureAgreement, pairsToShow } from './figure-agreements'

const figure = (name: string) => ({ id: name, name, slug: name.toLowerCase() })

const pair = (a: string, b: string, agreed: number, common: number): FigureAgreement => ({
  a: figure(a),
  b: figure(b),
  agreedSubjects: agreed,
  commonSubjects: common,
  examples: [],
})

const names = (pairs: FigureAgreement[]) => pairs.map((p) => `${p.a.name}-${p.b.name}`)

describe('pairsToShow', () => {
  it('shows first the pairs that agree on the most subjects, not those that merely met the most', () => {
    const shown = pairsToShow(
      [pair('Ada', 'Bob', 7, 28), pair('Cleo', 'Dan', 13, 17), pair('Eve', 'Finn', 18, 21)],
      3,
    )

    expect(names(shown)).toEqual(['Eve-Finn', 'Cleo-Dan', 'Ada-Bob'])
  })

  it('shows each personality once: the next pair is one nobody shown belongs to', () => {
    const shown = pairsToShow(
      [
        pair('Ada', 'Bob', 18, 21),
        pair('Ada', 'Cleo', 17, 20),
        pair('Bob', 'Cleo', 16, 20),
        pair('Dan', 'Eve', 5, 12),
      ],
      3,
    )

    expect(names(shown)).toEqual(['Ada-Bob', 'Dan-Eve'])
  })

  it('puts first, of two pairs agreeing on as many subjects, the one that disagrees on fewer', () => {
    const shown = pairsToShow([pair('Ada', 'Bob', 9, 20), pair('Cleo', 'Dan', 9, 12)], 2)

    expect(names(shown)).toEqual(['Cleo-Dan', 'Ada-Bob'])
  })

  it('shows no pair that agrees on nothing', () => {
    expect(pairsToShow([pair('Ada', 'Bob', 0, 15)], 4)).toEqual([])
  })
})
