import { OG_COLORS } from '../../../lib/og'
import { percent } from '../../../lib/percent'
import { row } from './styles'

interface ComparedShareProps {
  /** From 0 to 1 */
  share: number
  colour: string
  /** The measure of the slide, against the one it is compared to */
  strong?: boolean
}

/** A share as a bar with its figure beside it: one of the two a comparison sets side by side */
export default function ComparedShare({ share, colour, strong = false }: ComparedShareProps) {
  return (
    <div style={row(14)}>
      <div
        style={{
          width: `${Math.max(0.5, share * 80)}%`,
          height: '26px',
          borderRadius: '6px',
          backgroundColor: colour,
        }}
      />
      <span
        style={{
          fontSize: '24px',
          fontWeight: strong ? 600 : 400,
          color: strong ? OG_COLORS.ink : OG_COLORS.ink2,
        }}
      >
        {percent(share)}
      </span>
    </div>
  )
}
