import { describe, expect, it } from 'vitest'
import AlignmentTrack from './AlignmentTrack'
import { Alignment } from '../../../domain/services/group-alignment'

const alignment = (part: Partial<Alignment> = {}): Alignment => ({
  withAuthor: 1,
  total: 2,
  share: 0.5,
  low: 0.3,
  high: 0.7,
  deviation: 0,
  conclusive: false,
  ...part,
})

/** Les couches de la piste : l'axe, le trait de référence, l'intervalle, la pastille */
const layers = (props: Parameters<typeof AlignmentTrack>[0]) => {
  const track = AlignmentTrack(props)
  const children = (
    track.props.children as Array<false | { props: Record<string, unknown> }>
  ).filter((child): child is { props: Record<string, unknown> } => Boolean(child))
  return children.map(({ props }) => props as { style?: Record<string, string>; className: string })
}

/** « 55.00000000000001% » vaut 55 : on mesure une largeur, pas une chaîne */
const percentage = (width: string | undefined) => Number.parseFloat(width ?? '')

describe('AlignmentTrack', () => {
  it('places the reference line at the reference share', () => {
    const [, reference] = layers({ alignment: alignment(), reference: 0.42, label: 'Parti' })
    expect(reference.style?.left).toBe('42%')
  })

  it('spans the interval from its low bound to its high bound', () => {
    const [, , interval] = layers({
      alignment: alignment({ low: 0.2, high: 0.75 }),
      reference: 0.5,
      label: 'Parti',
    })

    expect(interval.style?.left).toBe('20%')
    expect(percentage(interval.style?.width)).toBeCloseTo(55)
  })

  it('places the dot at the observed share', () => {
    const drawn = layers({ alignment: alignment({ share: 0.31 }), reference: 0.5, label: 'Parti' })
    expect(drawn[drawn.length - 1].style?.left).toBe('31%')
  })

  it('draws no interval on the reference line, which is not an estimate', () => {
    const drawn = layers({
      alignment: alignment(),
      reference: 0.5,
      label: 'Ensemble',
      isReference: true,
    })
    expect(drawn).toHaveLength(3)
  })

  it('hollows the dot while the interval contains the reference', () => {
    const inconclusive = layers({ alignment: alignment(), reference: 0.5, label: 'Parti' })
    const conclusive = layers({
      alignment: alignment({ conclusive: true }),
      reference: 0.9,
      label: 'Parti',
    })

    expect(inconclusive[3].className).toMatch(/dotInconclusive/)
    expect(conclusive[3].className).not.toMatch(/dotInconclusive/)
  })

  it('reads out the share, its bounds and the reference it is compared to', () => {
    const drawn = layers({
      alignment: alignment({ share: 0.31, low: 0.14, high: 0.56 }),
      reference: 0.35,
      label: 'Élu·e national·e',
    })
    const dot = drawn[drawn.length - 1] as unknown as { 'aria-label': string }

    expect(dot['aria-label']).toBe(
      'Élu·e national·e : 31 %, entre 14 % et 56 %, contre 35 % pour l’ensemble',
    )
  })
})
