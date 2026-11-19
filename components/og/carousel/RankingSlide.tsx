import { SlideOf } from '../../../domain/read-models/subject-carousel'
import { OG_COLORS, truncate } from '../../../lib/og'
import { plural } from '../../../lib/plural'
import { authorsTally } from '../../../lib/carousel-image'
import CarouselFrame, { SlideChrome } from './CarouselFrame'
import CarouselHeading from './CarouselHeading'
import { body, column, serif, shadeOf } from './styles'

interface RankingSlideProps {
  slide: SlideOf<'ranking'>
  chrome: SlideChrome
}

/** The positions of the subject, from the most to the least supported, each with its bar */
export default function RankingSlide({ slide, chrome }: RankingSlideProps) {
  // Five rows hold where four breathe: the type gives way, not the fifth position
  const tight = slide.rows.length > 4
  return (
    <CarouselFrame chrome={chrome} note="Le site ne dit pas qui a raison">
      <CarouselHeading
        title={`${slide.positions} ${plural(slide.positions, 'position', 'positions')}`}
        lead="De la plus à la moins soutenue, par nombre de voix"
      />
      <div style={body(tight ? 34 : 48)}>
        {slide.rows.map((position, index) => (
          <div key={position.title} style={{ display: 'flex', gap: '32px' }}>
            <span style={{ ...serif(tight ? 96 : 120, 0.85), width: '130px', flexShrink: 0 }}>
              {position.count}
            </span>
            <div style={{ ...column(14), flex: 1 }}>
              <span
                style={{ fontSize: tight ? '34px' : '40px', fontWeight: 600, lineHeight: 1.15 }}
              >
                {truncate(position.title, 72)}
              </span>
              <div
                style={{
                  display: 'flex',
                  height: '18px',
                  borderRadius: '9px',
                  backgroundColor: OG_COLORS.line,
                }}
              >
                <div
                  style={{
                    width: `${Math.max(2, position.share * 100)}%`,
                    borderRadius: '9px',
                    backgroundColor: shadeOf(Math.min(index, 1)),
                  }}
                />
              </div>
              <span style={{ fontSize: '26px', color: OG_COLORS.ink2 }}>
                {authorsTally(position.figures, position.organisations, ' · ')}
              </span>
            </div>
          </div>
        ))}
        {slide.otherPositions > 0 && (
          <span style={{ fontSize: '26px', color: OG_COLORS.ink2 }}>
            {`et ${slide.otherPositions} ${plural(slide.otherPositions, 'autre position', 'autres positions')}`}
          </span>
        )}
      </div>
    </CarouselFrame>
  )
}
