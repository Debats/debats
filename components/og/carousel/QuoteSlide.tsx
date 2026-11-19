import { SlideOf } from '../../../domain/read-models/subject-carousel'
import { formatDate } from '../../../lib/format-date'
import { OG_COLORS, truncate } from '../../../lib/og'
import { sizeFor, SlideFaces } from '../../../lib/carousel-image'
import CarouselFace from './CarouselFace'
import CarouselFrame, { SlideChrome } from './CarouselFrame'
import { body, column, kicker, row, serif } from './styles'

interface QuoteSlideProps {
  slide: SlideOf<'quote'>
  chrome: SlideChrome
  faces: SlideFaces
}

/** The latest words of the most supported position, set large, with who said them and where */
export default function QuoteSlide({ slide, chrome, faces }: QuoteSlideProps) {
  const { quote } = slide
  return (
    <CarouselFrame chrome={chrome} note="La source est en lien sur le site">
      <div style={body(40)}>
        <span style={{ ...serif(260, 0.6), height: '110px', color: OG_COLORS.line }}>«</span>
        <span
          style={serif(
            sizeFor(
              quote.quote,
              [
                [90, 84],
                [150, 72],
                [220, 60],
              ],
              50,
            ),
            1.12,
          )}
        >
          {quote.quote}
        </span>

        <div style={row(28)}>
          <CarouselFace author={quote.author} faces={faces} size={136} />
          <div style={column(6)}>
            <span style={{ fontSize: '40px', fontWeight: 600 }}>
              {truncate(quote.author.name, 30)}
            </span>
            <span style={{ fontSize: '24px', color: OG_COLORS.ink2 }}>
              {`${formatDate(quote.statedAt)} · ${truncate(quote.sourceName, 36)}`}
            </span>
          </div>
        </div>

        <div
          style={{
            ...column(8),
            padding: '28px 32px',
            borderRadius: '16px',
            backgroundColor: OG_COLORS.paper2,
          }}
        >
          <span style={kicker}>Position défendue</span>
          <span style={{ fontSize: '34px', fontWeight: 600, lineHeight: 1.15 }}>
            {truncate(quote.position, 90)}
          </span>
        </div>
      </div>
    </CarouselFrame>
  )
}
