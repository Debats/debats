import { SlideOf } from '../../../domain/read-models/subject-carousel'
import { OG_COLORS, truncate } from '../../../lib/og'
import { plural } from '../../../lib/plural'
import { sizeFor, SlideFaces } from '../../../lib/carousel-image'
import CarouselFace from './CarouselFace'
import CarouselFrame, { SlideChrome } from './CarouselFrame'
import { column, kicker, serif } from './styles'

interface FacesSlideProps {
  slide: SlideOf<'faces'>
  chrome: SlideChrome
  faces: SlideFaces
}

const FACE = 176
const CELL = { ...column(14), alignItems: 'center', width: '33.33%', marginBottom: '30px' } as const

/** What the last place of the grid says of those it has no room for */
const rest = ({ more, organisations, faces }: SlideOf<'faces'>): string => {
  const hidden = organisations - faces.filter((face) => face.kind === 'organisation').length
  return hidden > 0
    ? `dont ${hidden} ${plural(hidden, 'organisation', 'organisations')}`
    : plural(more, 'autre voix', 'autres voix')
}

/** One position and who speaks for it: up to nine faces, named */
export default function FacesSlide({ slide, chrome, faces }: FacesSlideProps) {
  return (
    <CarouselFrame chrome={chrome} note="Chaque voix : une citation datée et sourcée">
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '32px',
          flexShrink: 0,
          marginTop: '52px',
        }}
      >
        <span style={serif(200, 0.8)}>{slide.count}</span>
        <div style={{ ...column(8), flex: 1 }}>
          <span style={kicker}>{`${plural(slide.count, 'voix', 'voix')} pour la position`}</span>
          <span
            style={serif(
              sizeFor(
                slide.position,
                [
                  [30, 68],
                  [56, 54],
                ],
                44,
              ),
            )}
          >
            {truncate(slide.position, 90)}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          flex: 1,
          alignContent: 'center',
          paddingTop: '30px',
        }}
      >
        {slide.faces.map((author) => (
          <div key={`${author.kind}-${author.id}`} style={CELL}>
            <CarouselFace author={author} faces={faces} size={FACE} />
            <span style={{ fontSize: '26px', fontWeight: 600, textAlign: 'center' }}>
              {truncate(author.name, 22)}
            </span>
          </div>
        ))}
        {slide.more > 0 && (
          <div style={CELL}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: `${FACE}px`,
                height: `${FACE}px`,
                borderRadius: '50%',
                backgroundColor: OG_COLORS.ink,
                color: OG_COLORS.paper,
                ...serif(76),
              }}
            >
              {`+${slide.more}`}
            </div>
            <span style={{ fontSize: '26px', color: OG_COLORS.ink2 }}>{rest(slide)}</span>
          </div>
        )}
      </div>
    </CarouselFrame>
  )
}
