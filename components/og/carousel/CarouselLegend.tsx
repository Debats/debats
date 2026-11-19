import { truncate } from '../../../lib/og'
import CarouselSwatch from './CarouselSwatch'
import { shadeOf } from './styles'

interface CarouselLegendProps {
  /** One entry per shade, in the order of the shades */
  entries: string[]
}

/** The longest entry two columns can hold; past it each entry takes a line of its own */
const TWO_COLUMNS = 30

/** Which shade stands for which position, under the heading */
export default function CarouselLegend({ entries }: CarouselLegendProps) {
  const wide = entries.some((entry) => entry.length > TWO_COLUMNS)
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', flexShrink: 0, marginTop: '28px' }}>
      {entries.map((entry, index) => (
        <div
          key={entry}
          style={{ display: 'flex', width: wide ? '100%' : '50%', marginBottom: '10px' }}
        >
          <CarouselSwatch
            colour={shadeOf(index)}
            label={truncate(entry, wide ? 68 : TWO_COLUMNS)}
          />
        </div>
      ))}
    </div>
  )
}
