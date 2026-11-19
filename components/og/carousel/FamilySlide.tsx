import { SlideOf } from '../../../domain/read-models/subject-carousel'
import { OG_COLORS, truncate } from '../../../lib/og'
import { plural } from '../../../lib/plural'
import { sizeFor, SlideFaces } from '../../../lib/carousel-image'
import CarouselFace from './CarouselFace'
import CarouselFrame, { SlideChrome } from './CarouselFrame'
import CarouselSwatch from './CarouselSwatch'
import ComparedShare from './ComparedShare'
import { body, column, kicker, row, serif, SHADES } from './styles'

interface FamilySlideProps {
  slide: SlideOf<'family'>
  chrome: SlideChrome
  faces: SlideFaces
}

const EVERYONE = SHADES[2]

/** One family of occupations: the position it leans to, and how it splits against everyone */
export default function FamilySlide({ slide, chrome, faces }: FamilySlideProps) {
  const { leading } = slide
  const more = leading.count - leading.faces.length
  return (
    <CarouselFrame chrome={chrome} note="Des voix recensées, pas un sondage">
      <div style={{ ...column(12), flexShrink: 0, marginTop: '44px' }}>
        <span style={kicker}>Famille de métiers</span>
        <span
          style={serif(
            sizeFor(
              slide.family,
              [
                [16, 84],
                [30, 68],
              ],
              54,
            ),
            0.98,
          )}
        >
          {slide.family}
        </span>
      </div>

      <div
        style={{
          ...row(28),
          flexShrink: 0,
          marginTop: '32px',
          padding: '26px 36px',
          borderRadius: '24px',
          backgroundColor: OG_COLORS.ink,
          color: OG_COLORS.paper,
        }}
      >
        <span style={serif(150, 0.82)}>{leading.count}</span>
        <span style={{ flex: 1, fontSize: '30px', fontWeight: 600, lineHeight: 1.2 }}>
          {`${plural(leading.count, 'voix', 'voix')} sur ${slide.total} pour « ${truncate(leading.position, 60)} »`}
        </span>
        <div style={row()}>
          {leading.faces.map((author, index) => (
            <CarouselFace
              key={author.id}
              author={author}
              faces={faces}
              size={92}
              overlap={index === 0 ? 0 : 24}
              ground={OG_COLORS.ink}
            />
          ))}
          {more > 0 && leading.faces.length > 0 && (
            <span style={{ ...serif(44), marginLeft: '12px' }}>{`+${more}`}</span>
          )}
        </div>
      </div>

      <div style={body(18)}>
        <div style={row(32)}>
          <CarouselSwatch
            colour={OG_COLORS.ink}
            label={truncate(slide.family, 28)}
            quiet={OG_COLORS.ink2}
          />
          <CarouselSwatch
            colour={EVERYONE}
            label="Toutes les personnalités"
            quiet={OG_COLORS.ink2}
          />
        </div>
        {slide.rows.map((position) => (
          <div key={position.position} style={column(6)}>
            <span style={{ fontSize: '28px', fontWeight: 600 }}>
              {truncate(position.position, 56)}
            </span>
            <ComparedShare share={position.share} colour={OG_COLORS.ink} strong />
            <ComparedShare share={position.overall} colour={EVERYONE} />
          </div>
        ))}
      </div>
    </CarouselFrame>
  )
}
