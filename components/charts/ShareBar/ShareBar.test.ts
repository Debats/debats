import { describe, expect, it } from 'vitest'
import ShareBar, { Share } from './index'

const share = (key: string, count: number, part: number): Share => ({
  key,
  label: key,
  count,
  share: part,
})

/** Les segments de la barre, dans l'ordre où elle les empile */
const segments = (shares: Share[], value?: number) => {
  const row = ShareBar({ label: 'Ligne', shares, value })
  const [, stack] = row.props.children
  return (stack.props.children as Array<{ props: { style: { width: string }; children: unknown } }>)
    .filter(Boolean)
    .map(({ props }) => ({ width: props.style.width, text: props.children }))
}

describe('ShareBar', () => {
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

  it('writes the percentage inside a segment wide enough to hold it', () => {
    expect(segments([share('a', 9, 0.9), share('b', 1, 0.1)]).map((s) => s.text)).toEqual([
      '90 %',
      false,
    ])
  })

  it('describes the bar by the counts, since the widths are not readable aloud', () => {
    const row = ShareBar({
      label: 'Ligne',
      shares: [share('Pour', 2, 0.5), share('Contre', 2, 0.5)],
    })
    const [, stack] = row.props.children
    expect(stack.props['aria-label']).toBe('Pour : 2, Contre : 2')
  })

  it('shows no third cell when the line carries no count', () => {
    const withoutValue = ShareBar({ label: 'Ligne', shares: [share('a', 1, 1)] })
    const withValue = ShareBar({ label: 'Ligne', shares: [share('a', 1, 1)], value: 7 })

    // Un total de couples (auteur, position) n'est pas un nombre de voix :
    // la page qui ne peut pas l'afficher n'a pas de troisième colonne.
    expect(withoutValue.props.children.filter(Boolean)).toHaveLength(2)
    expect(withValue.props.children.filter(Boolean)).toHaveLength(3)
  })
})
