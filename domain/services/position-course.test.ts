import { describe, expect, it } from 'vitest'
import { ALL_CONTRADICTORY, compatibilityOf } from '../read-models/position-judgements'
import { courseOf } from './position-course'

let recorded = 0

/** One statement on a position, recorded after the ones stated before it in the test */
const stated = (position: string, day: string) => ({
  position: { id: position },
  statedAt: new Date(`${day}T00:00:00Z`),
  recordedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, recorded++)),
})

const day = (date: string) => new Date(`${date}T00:00:00Z`)
const ids = (held: ReadonlyArray<{ position: { id: string } }>) => held.map((h) => h.position.id)

describe('courseOf, while every two positions exclude each other', () => {
  const course = (...entries: ReturnType<typeof stated>[]) => courseOf(entries, ALL_CONTRADICTORY)

  it('holds the one position of an author who keeps saying the same thing, since its first day', () => {
    const { held, moves } = course(stated('62', '2019-08-26'), stated('62', '2017-04-01'))

    expect(moves).toEqual([])
    expect(held).toEqual([
      { position: { id: '62' }, since: day('2017-04-01'), lastStatedAt: day('2019-08-26') },
    ])
  })

  it('reads a move from the position left, on its last day, to the one taken, on its first', () => {
    const { held, moves } = course(
      stated('62', '2017-04-01'),
      stated('62', '2019-08-26'),
      stated('65', '2022-03-17'),
      stated('65', '2023-01-10'),
    )

    expect(moves).toEqual([
      {
        from: { position: { id: '62' }, since: day('2017-04-01'), lastStatedAt: day('2019-08-26') },
        to: { position: { id: '65' }, statedAt: day('2022-03-17') },
      },
    ])
    expect(ids(held)).toEqual(['65'])
  })

  it('reads a return to a former position as a move of its own', () => {
    const { held, moves } = course(
      stated('62', '2017-04-01'),
      stated('65', '2022-03-17'),
      stated('62', '2025-01-10'),
    )

    expect(moves.map((m) => [m.from.position.id, m.to.position.id])).toEqual([
      ['62', '65'],
      ['65', '62'],
    ])
    expect(held).toMatchObject([{ position: { id: '62' }, since: day('2025-01-10') }])
  })

  it('holds together two positions stated the same day: nothing tells which came first', () => {
    const { held, moves } = course(
      stated('dotations', '2026-10-12'),
      stated('canicules', '2026-10-12'),
    )

    expect(moves).toEqual([])
    expect(ids(held)).toEqual(['dotations', 'canicules'])
  })

  it('still holds a position restated the day another is taken, whichever was recorded first', () => {
    // « 65 » was recorded before the « 62 » of the same day: the order of recording must not make a move
    const { held, moves } = course(
      stated('62', '2017-04-01'),
      stated('65', '2022-03-17'),
      stated('62', '2022-03-17'),
    )

    expect(moves).toEqual([])
    expect(ids(held)).toEqual(['62', '65'])
  })
})

describe('courseOf, once positions were judged compatible', () => {
  const compatible = compatibilityOf([
    { positionIds: ['ceasefire', 'genocide'], compatible: true },
    { positionIds: ['genocide', 'sanctions'], compatible: true },
  ])

  it('holds a position taken later with the one it is compatible with', () => {
    const { held, moves } = courseOf(
      [stated('ceasefire', '2024-05-31'), stated('genocide', '2026-02-06')],
      compatible,
    )

    expect(moves).toEqual([])
    expect(ids(held)).toEqual(['ceasefire', 'genocide'])
  })

  it('leaves only the positions the one taken contradicts', () => {
    const { held, moves } = courseOf(
      [
        stated('ceasefire', '2024-05-31'),
        stated('genocide', '2025-02-06'),
        stated('sanctions', '2026-01-01'),
      ],
      compatible,
    )

    // Sanctions go with genocide, not with ceasefire: nobody said so
    expect(moves.map((m) => [m.from.position.id, m.to.position.id])).toEqual([
      ['ceasefire', 'sanctions'],
    ])
    expect(ids(held)).toEqual(['genocide', 'sanctions'])
  })

  it('names the position left the most recently when the one taken contradicts several', () => {
    const { moves } = courseOf(
      [
        stated('ceasefire', '2024-05-31'),
        stated('genocide', '2025-02-06'),
        stated('support', '2026-01-01'),
      ],
      compatible,
    )

    expect(moves.map((m) => [m.from.position.id, m.to.position.id])).toEqual([
      ['genocide', 'support'],
    ])
  })
})
