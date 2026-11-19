import { SlideOf } from '../../../domain/read-models/subject-carousel'
import { curvesIn, spread } from '../../../lib/carousel-charts'
import { SLIDE_WIDTH } from '../../../lib/carousel-image'
import { OG_COLORS } from '../../../lib/og'
import CarouselFrame, { SlideChrome } from './CarouselFrame'
import CarouselHeading from './CarouselHeading'
import CarouselLegend from './CarouselLegend'
import { serif, shadeOf } from './styles'

interface CurvesSlideProps {
  slide: SlideOf<'curves'>
  chrome: SlideChrome
}

const HEIGHT = 600
const PLOT = { left: 12, right: 800, top: 30, bottom: 560 }
const VALUE_SIZE = 56
const YEAR = {
  position: 'absolute',
  top: `${PLOT.bottom + 16}px`,
  fontSize: '24px',
  color: OG_COLORS.ink2,
} as const

/** Voices gathered by each position year after year, one line per position */
export default function CurvesSlide({ slide, chrome }: CurvesSlideProps) {
  const curves = curvesIn(
    slide.lines.map((line) => line.points),
    PLOT,
  )
  const labels = spread(
    curves.map((curve) => curve.end.y),
    VALUE_SIZE - 8,
  )
  const middle = Math.round((slide.from + slide.to) / 2)
  return (
    <CarouselFrame chrome={chrome} note="Des voix recensées, pas un sondage">
      <CarouselHeading
        title={`${slide.to - slide.from} ans de débat`}
        lead={`Voix cumulées pour chaque position, de ${slide.from} à ${slide.to}`}
      />
      <CarouselLegend entries={slide.lines.map((line) => line.title)} />
      <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
        <div
          style={{
            display: 'flex',
            position: 'relative',
            width: `${SLIDE_WIDTH}px`,
            height: `${HEIGHT}px`,
          }}
        >
          <svg width={SLIDE_WIDTH} height={HEIGHT} viewBox={`0 0 ${SLIDE_WIDTH} ${HEIGHT}`}>
            <line
              x1={PLOT.left}
              y1={PLOT.bottom}
              x2={PLOT.right}
              y2={PLOT.bottom}
              stroke={OG_COLORS.ink}
              strokeWidth="3"
            />
            {/* The least supported first: the leading line is drawn over the others */}
            {curves
              .map((curve, index) => ({ curve, index }))
              .reverse()
              .map(({ curve, index }) => (
                <polyline
                  key={index}
                  points={curve.points}
                  fill="none"
                  stroke={shadeOf(index)}
                  strokeWidth={index < 2 ? 7 : 5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}
            {curves.map((curve, index) => (
              <circle key={index} cx={curve.end.x} cy={curve.end.y} r="9" fill={shadeOf(index)} />
            ))}
          </svg>
          {curves.map((curve, index) => (
            <span
              key={index}
              style={{
                position: 'absolute',
                left: `${PLOT.right + 24}px`,
                top: `${labels[index] - VALUE_SIZE / 2}px`,
                ...serif(VALUE_SIZE),
                color: index === 0 ? OG_COLORS.ink : OG_COLORS.ink2,
              }}
            >
              {curve.end.value}
            </span>
          ))}
          <span style={{ ...YEAR, left: `${PLOT.left}px` }}>{slide.from}</span>
          {middle > slide.from && middle < slide.to && (
            <span style={{ ...YEAR, left: `${(PLOT.left + PLOT.right) / 2 - 28}px` }}>
              {middle}
            </span>
          )}
          <span style={{ ...YEAR, left: `${PLOT.right - 56}px` }}>{slide.to}</span>
        </div>
      </div>
    </CarouselFrame>
  )
}
