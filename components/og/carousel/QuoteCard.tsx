import { CarouselQuote } from '../../../domain/read-models/subject-carousel'
import { formatShortDate } from '../../../lib/format-date'
import { OG_COLORS, truncate } from '../../../lib/og'
import { sizeFor, SlideFaces } from '../../../lib/carousel-image'
import CarouselFace from './CarouselFace'
import { column, kicker, row, serif } from './styles'

interface QuoteCardProps {
  quote: CarouselQuote
  faces: SlideFaces
  /** Set from the right edge: the second voice of a face-off answers the first */
  mirrored?: boolean
}

/** A voice of a face-off: the position it speaks for, its words, who said them and when */
export default function QuoteCard({ quote, faces, mirrored = false }: QuoteCardProps) {
  const align = mirrored ? 'flex-end' : 'flex-start'
  const text = mirrored ? 'right' : 'left'
  return (
    <div
      style={{
        ...column(22),
        alignItems: align,
        padding: '36px 40px',
        borderRadius: '20px',
        backgroundColor: OG_COLORS.card,
      }}
    >
      <span style={{ ...kicker, textAlign: text }}>{truncate(quote.position, 80)}</span>
      <span
        style={{ ...serif(sizeFor(quote.quote, [[110, 48]], 40), 1.15), textAlign: text }}
      >{`« ${quote.quote} »`}</span>
      <div style={{ ...row(20), flexDirection: mirrored ? 'row-reverse' : 'row' }}>
        <CarouselFace author={quote.author} faces={faces} size={88} />
        <div style={{ ...column(4), alignItems: align }}>
          <span style={{ fontSize: '32px', fontWeight: 600 }}>
            {truncate(quote.author.name, 30)}
          </span>
          <span style={{ fontSize: '24px', color: OG_COLORS.ink2 }}>
            {`${formatShortDate(quote.statedAt)} · ${truncate(quote.sourceName, 28)}`}
          </span>
        </div>
      </div>
    </div>
  )
}
