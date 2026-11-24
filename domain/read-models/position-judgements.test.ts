import { describe, it, expect } from 'vitest'
import {
  compatibilityBoard,
  compatibilityOf,
  compatibleCountLabel,
  heldTogetherLabel,
  subjectCompatibilityHref,
  verdictIn,
} from './position-judgements'

const genocide = { id: 'p-genocide', title: 'Qualification de génocide', slug: 'genocide' }
const sanctions = { id: 'p-sanctions', title: 'Sanctions contre Israël', slug: 'sanctions' }
const ceasefire = { id: 'p-ceasefire', title: 'Appel au cessez-le-feu', slug: 'cessez-le-feu' }
const support = { id: 'p-support', title: 'Soutien à l’action israélienne', slug: 'soutien' }

const judged = [
  { positionIds: ['p-genocide', 'p-sanctions'] as const, compatible: true },
  { positionIds: ['p-genocide', 'p-support'] as const, compatible: false },
]

describe('compatibilityOf', () => {
  const compatible = compatibilityOf(judged)

  it('holds a pair judged compatible, whichever position is named first', () => {
    expect(compatible('p-genocide', 'p-sanctions')).toBe(true)
    expect(compatible('p-sanctions', 'p-genocide')).toBe(true)
  })

  it('reads a pair judged contradictory, and one nobody judged, as contradictory', () => {
    expect(compatible('p-genocide', 'p-support')).toBe(false)
    expect(compatible('p-genocide', 'p-ceasefire')).toBe(false)
  })

  it('holds a position compatible with itself', () => {
    expect(compatible('p-genocide', 'p-genocide')).toBe(true)
  })
})

describe('verdictIn', () => {
  it('tells a pair judged contradictory from one nobody judged', () => {
    const verdict = verdictIn(judged)
    expect(verdict('p-support', 'p-genocide')).toBe(false)
    expect(verdict('p-genocide', 'p-ceasefire')).toBeUndefined()
    expect(verdict('p-sanctions', 'p-genocide')).toBe(true)
  })
})

describe('compatibilityBoard', () => {
  const hassan = { key: 'public_figure-hassan', name: 'Rima Hassan' }
  const autain = { key: 'public_figure-autain', name: 'Clémentine Autain' }
  const other = { key: 'public_figure-other', name: 'Une autre voix' }
  const voices = [
    { author: hassan, positionId: 'p-genocide' },
    { author: hassan, positionId: 'p-sanctions' },
    { author: hassan, positionId: 'p-sanctions' },
    { author: autain, positionId: 'p-ceasefire' },
    { author: autain, positionId: 'p-genocide' },
    { author: other, positionId: 'p-genocide' },
  ]
  // Sanctions and ceasefire have one voice each: a tie keeps the order the positions came in
  const positions = [support, sanctions, ceasefire, genocide]
  const board = (selected?: string) =>
    compatibilityBoard('gaza', positions, judged, voices, selected)

  it('lists the positions the most supported first, each with the positions judged compatible with it', () => {
    expect(board().positions.map((p) => [p.position.slug, p.compatible])).toEqual([
      ['genocide', 1],
      ['sanctions', 1],
      ['cessez-le-feu', 0],
      ['soutien', 0],
    ])
  })

  it('opens on the most supported position, or on the one the address names', () => {
    expect(board().selected).toEqual(genocide)
    expect(board('sanctions').selected).toEqual(sanctions)
    expect(board('unknown').selected).toEqual(genocide)
  })

  it('leads each position to its own view of the board', () => {
    expect(board().positions[1].href).toBe('/s/gaza/positions-compatibles?position=sanctions')
    expect(board().positions.map((p) => p.selected)).toEqual([true, false, false, false])
  })

  it('faces the selected position with every other, those somebody holds with it first', () => {
    expect(board().rows).toEqual([
      { position: sanctions, compatible: true, heldBy: ['Rima Hassan'] },
      { position: ceasefire, compatible: false, heldBy: ['Clémentine Autain'] },
      { position: support, compatible: false, heldBy: [] },
    ])
  })

  it('has nothing to face on a subject with a single position', () => {
    expect(compatibilityBoard('gaza', [genocide], [], [], undefined)).toMatchObject({
      selected: genocide,
      rows: [],
    })
    expect(compatibilityBoard('gaza', [], [], [], undefined)).toEqual({
      positions: [],
      selected: null,
      rows: [],
    })
  })
})

describe('the labels of the board', () => {
  it('name who holds two positions together, the first by name and the rest by number', () => {
    expect(heldTogetherLabel([])).toBeNull()
    expect(heldTogetherLabel(['Rima Hassan'])).toBe('Les deux chez Rima Hassan')
    expect(heldTogetherLabel(['Rima Hassan', 'A'])).toBe('Les deux chez Rima Hassan et 1 autre')
    expect(heldTogetherLabel(['Rima Hassan', 'A', 'B'])).toBe(
      'Les deux chez Rima Hassan et 2 autres',
    )
  })

  it('count the positions judged compatible with one', () => {
    expect(compatibleCountLabel(0)).toBe('aucune')
    expect(compatibleCountLabel(1)).toBe('1 compatible')
    expect(compatibleCountLabel(2)).toBe('2 compatibles')
  })
})

describe('subjectCompatibilityHref', () => {
  it('names the page, then the position it opens on', () => {
    expect(subjectCompatibilityHref('gaza')).toBe('/s/gaza/positions-compatibles')
    expect(subjectCompatibilityHref('gaza', 'genocide')).toBe(
      '/s/gaza/positions-compatibles?position=genocide',
    )
  })
})
