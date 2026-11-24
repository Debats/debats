import { describe, it, expect } from 'vitest'
import { positionVerdictsOf } from './position-verdicts'

describe('positionVerdictsOf', () => {
  it('keeps the answers that name a position and a verdict, and nothing else of them', () => {
    expect(
      positionVerdictsOf([
        { positionId: 'p-1', compatible: true, extra: 'dropped' },
        { positionId: 'p-2', compatible: false },
      ]),
    ).toEqual([
      { positionId: 'p-1', compatible: true },
      { positionId: 'p-2', compatible: false },
    ])
  })

  it('drops what is not an answer', () => {
    expect(
      positionVerdictsOf([
        null,
        'p-1',
        { positionId: '', compatible: true },
        { positionId: 'p-1', compatible: 'yes' },
        { compatible: true },
      ]),
    ).toEqual([])
  })

  it('reads anything but an array as no answer at all', () => {
    expect(positionVerdictsOf(undefined)).toEqual([])
    expect(positionVerdictsOf({ positionId: 'p-1', compatible: true })).toEqual([])
  })
})
