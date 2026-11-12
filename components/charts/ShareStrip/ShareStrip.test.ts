import { describe, expect, it } from 'vitest'
import ShareStrip, { Share } from './index'

const share = (key: string, count: number, part: number): Share => ({
  key,
  label: key,
  count,
  share: part,
})

/** Les segments de la bande, dans l'ordre où elle les empile */
const segments = (shares: Share[], percentages?: boolean) => {
  const strip = ShareStrip({ shares, percentages })
  return (
    strip.props.children as Array<{ props: { style: { width: string }; children: unknown } }>
  ).map(({ props }) => ({ width: props.style.width, text: props.children }))
}

describe('ShareStrip', () => {
  it('gives each segment the width of its share', () => {
    expect(segments([share('a', 2, 0.5), share('b', 2, 0.5)]).map((s) => s.width)).toEqual([
      '50%',
      '50%',
    ])
  })

  it('leaves a segment nobody defends at zero width', () => {
    expect(segments([share('a', 3, 1), share('b', 0, 0)]).map((s) => s.width)).toEqual([
      '100%',
      '0%',
    ])
  })

  it('writes the percentage inside a segment wide enough to hold it, when asked to', () => {
    expect(segments([share('a', 9, 0.9), share('b', 1, 0.1)], true).map((s) => s.text)).toEqual([
      '90 %',
      false,
    ])
  })

  it('writes nothing inside its segments unless asked to: a thin strip has no room', () => {
    expect(segments([share('a', 9, 0.9), share('b', 1, 0.1)]).map((s) => s.text)).toEqual([
      false,
      false,
    ])
  })

  it('describes itself by the counts, since the widths are not readable aloud', () => {
    const strip = ShareStrip({ shares: [share('Pour', 2, 0.5), share('Contre', 2, 0.5)] })

    expect(strip.props.role).toBe('img')
    expect(strip.props['aria-label']).toBe('Pour : 2, Contre : 2')
  })
})
