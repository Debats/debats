import { SlideOf } from '../../../domain/read-models/subject-carousel'
import { OG_COLORS, truncate } from '../../../lib/og'
import { elapsed, sizeFor, SlideFaces } from '../../../lib/carousel-image'
import CarouselFace from './CarouselFace'
import CarouselFrame, { SlideChrome } from './CarouselFrame'
import JourneyStepCard from './JourneyStepCard'
import { body, column, row, serif } from './styles'

interface JourneySlideProps {
  slide: SlideOf<'journey'>
  chrome: SlideChrome
  faces: SlideFaces
}

/** A public figure who left a position for another: her two statements, and the time between them */
export default function JourneySlide({ slide, chrome, faces }: JourneySlideProps) {
  return (
    <CarouselFrame chrome={chrome} note="Chaque prise de position est datée">
      <div style={{ ...row(32), flexShrink: 0, marginTop: '48px' }}>
        <CarouselFace author={slide.figure} faces={faces} size={168} />
        <div style={{ ...column(8), flex: 1 }}>
          <span
            style={serif(
              sizeFor(
                slide.figure.name,
                [
                  [16, 84],
                  [24, 68],
                ],
                56,
              ),
            )}
          >
            {truncate(slide.figure.name, 40)}
          </span>
          <span style={{ ...serif(36), fontStyle: 'italic', color: OG_COLORS.ink2 }}>
            Deux dates, deux positions
          </span>
        </div>
      </div>

      <div style={body(20)}>
        <JourneyStepCard step={slide.from} />
        <div style={row(32)}>
          <div style={{ display: 'flex', justifyContent: 'center', width: '150px', flexShrink: 0 }}>
            <svg width="28" height="56" viewBox="0 0 28 56">
              <path
                d="M14 2v50M4 42l10 10 10-10"
                fill="none"
                stroke={OG_COLORS.ink2}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span style={{ fontSize: '26px', color: OG_COLORS.ink2 }}>
            {`${elapsed(slide.from.statedAt, slide.to.statedAt)} plus tard`}
          </span>
        </div>
        <JourneyStepCard step={slide.to} />
      </div>
    </CarouselFrame>
  )
}
