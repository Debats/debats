import { OG_COLORS } from '../../../lib/og'
import { sizeFor } from '../../../lib/carousel-image'
import { column, serif } from './styles'

interface CarouselHeadingProps {
  title: string
  /** What the slide measures, in a line of italic under its title */
  lead?: string
}

/** The title of a slide and what it measures: said once, at the top, the same way on every slide */
export default function CarouselHeading({ title, lead }: CarouselHeadingProps) {
  const size = sizeFor(
    title,
    [
      [20, 84],
      [34, 72],
    ],
    60,
  )
  return (
    <div style={{ ...column(12), flexShrink: 0, marginTop: '44px' }}>
      <span style={serif(size)}>{title}</span>
      {lead !== undefined && (
        <span style={{ ...serif(34, 1.2), fontStyle: 'italic', color: OG_COLORS.ink2 }}>
          {lead}
        </span>
      )}
    </div>
  )
}
