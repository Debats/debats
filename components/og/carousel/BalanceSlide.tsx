import { SlideOf } from '../../../domain/read-models/subject-carousel'
import { bandsIn } from '../../../lib/carousel-charts'
import { SLIDE_WIDTH } from '../../../lib/carousel-image'
import { OG_COLORS } from '../../../lib/og'
import BandShare from './BandShare'
import CarouselFrame, { SlideChrome } from './CarouselFrame'
import CarouselHeading from './CarouselHeading'
import CarouselLegend from './CarouselLegend'
import { body, shadeOf } from './styles'

interface BalanceSlideProps {
  slide: SlideOf<'balance'>
  chrome: SlideChrome
}

const HEIGHT = 540

const periodLabel = ({ from, to }: { from: number; to: number }): string =>
  from === to ? String(from) : `${from}–${String(to).slice(2)}`

/** The share of each position among the statements of each period, as bands across the years */
export default function BalanceSlide({ slide, chrome }: BalanceSlideProps) {
  const bands = bandsIn(
    slide.periods.map((period) => period.shares),
    SLIDE_WIDTH,
    HEIGHT,
  )
  const first = slide.periods[0].shares
  const last = slide.periods[slide.periods.length - 1].shares

  return (
    <CarouselFrame chrome={chrome} note="Des voix recensées, pas un sondage">
      <CarouselHeading
        title="Le rapport de force"
        lead="Part de chaque position dans les prises de position de chaque période"
      />
      <CarouselLegend entries={slide.positions} />
      <div style={body(14)}>
        <div
          style={{
            display: 'flex',
            position: 'relative',
            width: `${SLIDE_WIDTH}px`,
            height: `${HEIGHT}px`,
          }}
        >
          <svg width={SLIDE_WIDTH} height={HEIGHT} viewBox={`0 0 ${SLIDE_WIDTH} ${HEIGHT}`}>
            {bands.map((band, index) => (
              <polygon
                key={index}
                points={band.points}
                fill={shadeOf(index)}
                stroke={OG_COLORS.paper}
                strokeWidth="3"
                strokeLinejoin="round"
              />
            ))}
          </svg>
          {bands.map((band, index) => (
            <BandShare
              key={`left-${index}`}
              edge={band.left}
              side="left"
              share={first[index]}
              index={index}
            />
          ))}
          {bands.map((band, index) => (
            <BandShare
              key={`right-${index}`}
              edge={band.right}
              side="right"
              share={last[index]}
              index={index}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {slide.periods.map((period) => (
            <span key={period.from} style={{ fontSize: '24px', color: OG_COLORS.ink2 }}>
              {periodLabel(period)}
            </span>
          ))}
        </div>
      </div>
    </CarouselFrame>
  )
}
