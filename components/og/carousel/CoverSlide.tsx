import { SlideOf } from '../../../domain/read-models/subject-carousel'
import { OG_COLORS, truncate } from '../../../lib/og'
import { plural } from '../../../lib/plural'
import { authorsTally, sizeFor, SlideFaces } from '../../../lib/carousel-image'
import CarouselFace from './CarouselFace'
import CarouselFrame, { SlideChrome } from './CarouselFrame'
import { body, column, kicker, row, serif } from './styles'

interface CoverSlideProps {
  slide: SlideOf<'cover'>
  chrome: SlideChrome
  faces: SlideFaces
}

/** Who spoke and how much, in one sentence */
const tally = ({ figures, organisations, statements }: SlideOf<'cover'>): string =>
  `${authorsTally(figures, organisations, ' et ')}, ${statements} ${plural(statements, 'prise de position datée et sourcée', 'prises de position datées et sourcées')}.`

/** The first slide: the subject as title, its question, and faces of every camp */
export default function CoverSlide({ slide, chrome, faces }: CoverSlideProps) {
  const { from, to } = slide.span
  return (
    <CarouselFrame
      chrome={chrome}
      corner={from === to ? String(to) : `${from} → ${to}`}
      note="Faites défiler →"
    >
      <div style={body(32)}>
        <span style={kicker}>Qui pense quoi ?</span>
        <span
          style={{
            ...serif(
              sizeFor(
                chrome.title,
                [
                  [12, 190],
                  [20, 140],
                  [34, 108],
                  [60, 84],
                ],
                68,
              ),
              0.95,
            ),
          }}
        >
          {chrome.title}
        </span>
        <span
          style={{
            ...serif(chrome.problem.length > 120 ? 38 : 46, 1.22),
            fontStyle: 'italic',
            color: OG_COLORS.ink2,
          }}
        >
          {truncate(chrome.problem, 230)}
        </span>
      </div>

      <div style={{ ...column(24), flexShrink: 0, paddingBottom: '32px' }}>
        <div style={row()}>
          {slide.faces.map((author, index) => (
            <CarouselFace
              key={author.id}
              author={author}
              faces={faces}
              size={112}
              overlap={index === 0 ? 0 : 28}
              ground={OG_COLORS.paper}
            />
          ))}
          {slide.moreAuthors > 0 && (
            <span style={{ ...serif(56), marginLeft: '20px' }}>{`+ ${slide.moreAuthors}`}</span>
          )}
        </div>
        <span style={{ fontSize: '30px', lineHeight: 1.35, color: OG_COLORS.ink2 }}>
          {tally(slide)}
        </span>
      </div>
    </CarouselFrame>
  )
}
