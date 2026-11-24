import { describe, expect, it } from 'vitest'
import { positionsHeld } from './author-course'
import { ALL_CONTRADICTORY, compatibilityOf } from './position-judgements'

let recorded = 0

const stated = (id: string, date: string) => ({
  position: { id },
  statement: {
    statedAt: new Date(`${date}T00:00:00Z`),
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, recorded++)),
  },
})

const held = (...args: Parameters<typeof positionsHeld>) => Array.from(positionsHeld(...args))

describe('positionsHeld', () => {
  it('holds the one position of an author who keeps saying the same thing', () => {
    expect(
      held([stated('62', '2017-03-02'), stated('62', '2019-04-25')], ALL_CONTRADICTORY),
    ).toEqual(['62'])
  })

  it('holds only the last position of an author who left one for another', () => {
    expect(
      held(
        [stated('62', '2017-03-02'), stated('62', '2019-04-25'), stated('65', '2022-03-17')],
        ALL_CONTRADICTORY,
      ),
    ).toEqual(['65'])
  })

  it('holds together the positions judged compatible', () => {
    expect(
      held(
        [stated('ceasefire', '2024-05-31'), stated('genocide', '2026-02-06')],
        compatibilityOf([{ positionIds: ['ceasefire', 'genocide'], compatible: true }]),
      ),
    ).toEqual(['ceasefire', 'genocide'])
  })

  it('holds nothing for an author who said nothing', () => {
    expect(held([], ALL_CONTRADICTORY)).toEqual([])
  })
})
