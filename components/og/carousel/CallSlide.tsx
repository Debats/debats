import { SlideOf } from '../../../domain/read-models/subject-carousel'
import { CALL_QR_CODE } from '../../../lib/carousel-image'
import { plural } from '../../../lib/plural'
import CarouselFrame, { SlideChrome } from './CarouselFrame'
import { body, column, ON_INK_QUIET, row, serif } from './styles'

interface CallSlideProps {
  slide: SlideOf<'call'>
  chrome: SlideChrome
  /** The address of the subject as a QR code, as a data URI: nobody types a long address */
  qrCode: string
}

/** The last slide: where the rest is read, and the invitation to add a voice */
export default function CallSlide({ slide, chrome, qrCode }: CallSlideProps) {
  return (
    <CarouselFrame chrome={chrome} note="Il ne dit pas qui a raison" dark>
      <div style={body(48)}>
        <div style={column(20)}>
          <span style={serif(132, 0.95)}>Il manque une voix ?</span>
          <span style={{ ...serif(48, 1.2), fontStyle: 'italic', color: ON_INK_QUIET }}>
            Ajoutez-la : une citation, une date, une source.
          </span>
        </div>

        <div style={row(44)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- le moteur OpenGraph ne connaît pas next/image */}
          <img
            src={qrCode}
            alt=""
            width={CALL_QR_CODE}
            height={CALL_QR_CODE}
            style={{ borderRadius: '20px', flexShrink: 0 }}
          />
          <div style={{ ...column(20), flex: 1 }}>
            <span style={{ fontSize: '30px', lineHeight: 1.3, color: ON_INK_QUIET }}>
              {slide.statements > 1
                ? `Les ${slide.statements} ${plural(slide.statements, 'prise de position', 'prises de position')}, leurs sources et la suite du débat sont sur Débats.co.`
                : 'La prise de position, sa source et la suite du débat sont sur Débats.co.'}
            </span>
            <span style={{ fontSize: '28px', fontWeight: 600, lineHeight: 1.3 }}>
              Qui pense quoi, et sur quelles bases.
            </span>
          </div>
        </div>
      </div>
    </CarouselFrame>
  )
}
