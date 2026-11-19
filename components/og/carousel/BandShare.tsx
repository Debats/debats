import { percent } from '../../../lib/percent'
import { onShade, serif } from './styles'

interface BandShareProps {
  /** The band at the edge the share is written on */
  edge: { top: number; bottom: number }
  side: 'left' | 'right'
  /** From 0 to 1 */
  share: number
  /** The rank of the band, for the colour its text takes */
  index: number
}

const SIZE = 56
/** A share is written in its band only where the band is tall enough to hold it */
const WRITTEN_FROM = SIZE + 20

/** The share of a position at one end of the chart, written in the middle of its band */
export default function BandShare({ edge, side, share, index }: BandShareProps) {
  if (edge.bottom - edge.top < WRITTEN_FROM) return null
  return (
    <span
      style={{
        position: 'absolute',
        [side]: '24px',
        top: `${(edge.top + edge.bottom) / 2 - SIZE / 2}px`,
        ...serif(SIZE),
        color: onShade(index),
      }}
    >
      {percent(share)}
    </span>
  )
}
