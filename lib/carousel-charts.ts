/** Where a chart is drawn inside its canvas, in pixels */
export interface Plot {
  left: number
  right: number
  top: number
  bottom: number
}

export interface Curve {
  /** The points of the line, as an SVG polyline reads them */
  points: string
  /** Where the line ends, and the value it ends on */
  end: { x: number; y: number; value: number }
}

const round = (value: number) => Math.round(value * 10) / 10

/**
 * Lines of the same length drawn in one plot, on one scale: the highest value
 * of all touches the top. A single point sits at the left edge.
 */
export function curvesIn(lines: number[][], plot: Plot): Curve[] {
  const highest = Math.max(1, ...lines.flat())
  const x = (index: number, length: number) =>
    plot.left + (length > 1 ? (index / (length - 1)) * (plot.right - plot.left) : 0)
  const y = (value: number) => plot.bottom - (value / highest) * (plot.bottom - plot.top)

  return lines.map((line) => ({
    points: line.map((value, i) => `${round(x(i, line.length))},${round(y(value))}`).join(' '),
    end: {
      x: round(x(line.length - 1, line.length)),
      y: round(y(line.at(-1) ?? 0)),
      value: line.at(-1) ?? 0,
    },
  }))
}

/**
 * Heights kept apart: each one stays where it is unless it would sit closer
 * than `gap` under the one above it, and is then pushed down. Given and
 * returned in the same order.
 */
export function spread(heights: number[], gap: number): number[] {
  const order = heights
    .map((height, index) => ({ height, index }))
    .sort((a, b) => a.height - b.height)
  const placed = new Array<number>(heights.length)
  let floor = -Infinity
  for (const { height, index } of order) {
    placed[index] = Math.max(height, floor)
    floor = placed[index] + gap
  }
  return placed
}

export interface Band {
  /** The outline of the band, as an SVG polygon reads it */
  points: string
  /** Its top and bottom at the left and right edges, to set a label in it */
  left: { top: number; bottom: number }
  right: { top: number; bottom: number }
}

/**
 * Shares stacked from the bottom up, period after period, as bands across a
 * canvas: `periods[i][p]` is the share of position `p` in period `i`.
 */
export function bandsIn(periods: number[][], width: number, height: number): Band[] {
  const x = (i: number) => round((i / Math.max(1, periods.length - 1)) * width)
  const below = (shares: number[], position: number) =>
    shares.slice(0, position).reduce((sum, share) => sum + share, 0)
  const y = (cumulated: number) => round(height * (1 - Math.min(1, cumulated)))

  return (periods[0] ?? []).map((_, position) => {
    const bottoms = periods.map((shares) => y(below(shares, position)))
    const tops = periods.map((shares) => y(below(shares, position + 1)))
    const last = periods.length - 1
    return {
      points: [
        ...tops.map((top, i) => `${x(i)},${top}`),
        ...bottoms.map((bottom, i) => `${x(i)},${bottom}`).reverse(),
      ].join(' '),
      left: { top: tops[0], bottom: bottoms[0] },
      right: { top: tops[last], bottom: bottoms[last] },
    }
  })
}
