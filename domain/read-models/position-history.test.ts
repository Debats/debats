import { describe, expect, it } from 'vitest'
import { historyEventLabel, positionHistory } from './position-history'
import { ALL_CONTRADICTORY, compatibilityOf } from './position-judgements'

let recorded = 0

/** One statement on a position, recorded after the ones stated before it in the test */
const stated = (position: string, day: string) => ({
  position: { id: position, title: position },
  statement: {
    statedAt: new Date(`${day}T00:00:00Z`),
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, recorded++)),
  },
})

type History = NonNullable<ReturnType<typeof positionHistory<ReturnType<typeof stated>>>>

/** A row as the tests read it: its position, then only what the graph draws */
const drawn = ({ rows }: History) =>
  rows.map(({ entry, lane, tone, restated, crossing, curvesFrom }) => ({
    position: entry.position.id,
    lane,
    tone,
    restated,
    crossing,
    curvesFrom,
  }))

const events = ({ rows }: History) =>
  rows.map(({ event }) => event && [event.kind, event.positions.map((p) => p.id)])

describe('positionHistory', () => {
  it('has nothing to tell of fewer than two statements', () => {
    expect(positionHistory([], ALL_CONTRADICTORY)).toBeNull()
    expect(positionHistory([stated('62', '2017-03-02')], ALL_CONTRADICTORY)).toBeNull()
  })

  it('has nothing to tell of an author who only restates one position', () => {
    expect(
      positionHistory([stated('62', '2017-03-02'), stated('62', '2019-04-25')], ALL_CONTRADICTORY),
    ).toBeNull()
  })

  it('has nothing to tell of positions all taken the same day', () => {
    expect(
      positionHistory(
        [stated('dotations', '2026-10-12'), stated('canicules', '2026-10-12')],
        ALL_CONTRADICTORY,
      ),
    ).toBeNull()
  })

  it('reads from the most recent statement to the oldest', () => {
    const history = positionHistory(
      [stated('62', '2019-04-25'), stated('65', '2022-03-17'), stated('62', '2017-03-02')],
      ALL_CONTRADICTORY,
    )!

    expect(history.rows.map((row) => row.entry.statement.statedAt.getUTCFullYear())).toEqual([
      2022, 2019, 2017,
    ])
  })

  it('jumps from the lane of the position left, which ends there, to the one taken', () => {
    const history = positionHistory(
      [stated('62', '2017-03-02'), stated('62', '2019-04-25'), stated('65', '2022-03-17')],
      ALL_CONTRADICTORY,
    )!

    expect(history.lanes).toBe(2)
    expect(drawn(history)).toEqual([
      { position: '65', lane: 1, tone: 'held', restated: false, crossing: [], curvesFrom: [0] },
      { position: '62', lane: 0, tone: 'left', restated: true, crossing: [], curvesFrom: [] },
      { position: '62', lane: 0, tone: 'left', restated: false, crossing: [], curvesFrom: [] },
    ])
    expect(events(history)).toEqual([['leaves', ['62']], null, null])
  })

  it('branches off a compatible position, whose lane runs on beside the new one', () => {
    const history = positionHistory(
      [stated('ceasefire', '2024-05-31'), stated('genocide', '2026-02-06')],
      compatibilityOf([{ positionIds: ['ceasefire', 'genocide'], compatible: true }]),
    )!

    expect(drawn(history)).toEqual([
      {
        position: 'genocide',
        lane: 1,
        tone: 'held',
        restated: false,
        crossing: [{ lane: 0, tone: 'held' }],
        curvesFrom: [0],
      },
      {
        position: 'ceasefire',
        lane: 0,
        tone: 'held',
        restated: false,
        crossing: [],
        curvesFrom: [],
      },
    ])
    expect(events(history)).toEqual([['joins', ['ceasefire']], null])
  })

  it('runs the lane of a position left up to the statement that contradicts it, through the rows between', () => {
    const history = positionHistory(
      [
        stated('ceasefire', '2024-05-31'),
        stated('genocide', '2025-02-06'),
        stated('support', '2026-01-01'),
      ],
      compatibilityOf([{ positionIds: ['ceasefire', 'genocide'], compatible: true }]),
    )!

    expect(drawn(history)).toEqual([
      // Both lanes end under the row that contradicts them, and curve into it
      {
        position: 'support',
        lane: 2,
        tone: 'held',
        restated: false,
        crossing: [],
        curvesFrom: [0, 1],
      },
      {
        position: 'genocide',
        lane: 1,
        tone: 'left',
        restated: false,
        crossing: [{ lane: 0, tone: 'left' }],
        curvesFrom: [0],
      },
      {
        position: 'ceasefire',
        lane: 0,
        tone: 'left',
        restated: false,
        crossing: [],
        curvesFrom: [],
      },
    ])
    expect(events(history)).toEqual([
      ['leaves', ['ceasefire', 'genocide']],
      ['joins', ['ceasefire']],
      null,
    ])
  })

  it('gives a position taken again its lane back, as a stretch of its own', () => {
    const history = positionHistory(
      [stated('62', '2017-03-02'), stated('65', '2022-03-17'), stated('62', '2025-01-10')],
      ALL_CONTRADICTORY,
    )!

    expect(history.lanes).toBe(2)
    expect(drawn(history)).toEqual([
      { position: '62', lane: 0, tone: 'held', restated: false, crossing: [], curvesFrom: [1] },
      { position: '65', lane: 1, tone: 'left', restated: false, crossing: [], curvesFrom: [0] },
      { position: '62', lane: 0, tone: 'left', restated: false, crossing: [], curvesFrom: [] },
    ])
  })

  it('branches off the position she stated last when she holds several', () => {
    const compatible = compatibilityOf([
      { positionIds: ['a', 'b'], compatible: true },
      { positionIds: ['a', 'c'], compatible: true },
      { positionIds: ['b', 'c'], compatible: true },
    ])
    const history = positionHistory(
      [
        stated('a', '2020-01-01'),
        stated('b', '2021-01-01'),
        stated('a', '2022-01-01'),
        stated('c', '2023-01-01'),
      ],
      compatible,
    )!

    expect(drawn(history)[0]).toMatchObject({ position: 'c', curvesFrom: [0] })
    expect(events(history)[0]).toEqual(['joins', ['a', 'b']])
  })
})

describe('historyEventLabel', () => {
  const titled = (...titles: string[]) => titles.map((title) => ({ id: title, title }))

  it('says nothing of a position she left: the lanes show it', () => {
    expect(historyEventLabel({ kind: 'leaves', positions: titled('Maintien à 62 ans') })).toBeNull()
  })

  it('names the position she holds with the one taken', () => {
    expect(historyEventLabel({ kind: 'joins', positions: titled('Appel au cessez-le-feu') })).toBe(
      'avec « Appel au cessez-le-feu »',
    )
  })

  it('names every position when there are several', () => {
    expect(historyEventLabel({ kind: 'joins', positions: titled('A', 'B', 'C') })).toBe(
      'avec « A », « B » et « C »',
    )
  })
})
