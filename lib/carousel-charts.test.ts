import { describe, expect, it } from 'vitest'
import { bandsIn, curvesIn, spread } from './carousel-charts'

describe('curvesIn', () => {
  const plot = { left: 0, right: 100, top: 0, bottom: 50 }

  it('draws every line on the scale of the highest value of all', () => {
    const [high, low] = curvesIn(
      [
        [0, 5, 10],
        [0, 0, 5],
      ],
      plot,
    )

    expect(high.points).toBe('0,50 50,25 100,0')
    expect(low.points).toBe('0,50 50,50 100,25')
    expect(low.end).toEqual({ x: 100, y: 25, value: 5 })
  })

  it('keeps flat lines of zeros on the floor', () => {
    expect(curvesIn([[0, 0]], plot)[0].points).toBe('0,50 100,50')
  })
})

describe('spread', () => {
  it('pushes down what sits too close under its neighbour, in the order given', () => {
    expect(spread([100, 10, 20], 30)).toEqual([100, 10, 40])
  })

  it('leaves alone what is already apart', () => {
    expect(spread([0, 50, 100], 30)).toEqual([0, 50, 100])
  })
})

describe('bandsIn', () => {
  it('stacks the shares from the bottom up, period after period', () => {
    const [first, second] = bandsIn(
      [
        [0.25, 0.75],
        [0.5, 0.5],
      ],
      100,
      200,
    )

    expect(first.points).toBe('0,150 100,100 100,200 0,200')
    expect(second.points).toBe('0,0 100,0 100,100 0,150')
    expect(second.left).toEqual({ top: 0, bottom: 150 })
    expect(second.right).toEqual({ top: 0, bottom: 100 })
  })
})
