import { SlideOf } from '../../../domain/read-models/subject-carousel'
import { formatShortDate } from '../../../lib/format-date'
import { OG_COLORS, truncate } from '../../../lib/og'
import { plural } from '../../../lib/plural'
import { SlideFaces } from '../../../lib/carousel-image'
import CarouselFace from './CarouselFace'
import CarouselFrame, { SlideChrome } from './CarouselFrame'
import CarouselHeading from './CarouselHeading'
import { body, column, kicker, row } from './styles'

interface OrganisationsSlideProps {
  slide: SlideOf<'organisations'>
  chrome: SlideChrome
  faces: SlideFaces
}

/** The organisations that spoke on the subject, under the position each one took */
export default function OrganisationsSlide({ slide, chrome, faces }: OrganisationsSlideProps) {
  return (
    <CarouselFrame chrome={chrome} note="Partis, syndicats, ONG, entreprises">
      <CarouselHeading
        title={`${slide.count} ${plural(slide.count, 'organisation', 'organisations')}`}
        lead="Sous la position que chacune défend"
      />
      <div style={body(32)}>
        {slide.groups.map((group) => (
          <div key={group.position} style={column(16)}>
            <span
              style={{
                ...kicker,
                paddingBottom: '12px',
                borderBottom: `2px solid ${OG_COLORS.line}`,
              }}
            >
              {truncate(group.position, 90)}
            </span>
            {group.entries.map((entry) => (
              <div key={entry.organisation.id} style={row(24)}>
                <CarouselFace author={entry.organisation} faces={faces} size={84} />
                <div style={column(2)}>
                  <span style={{ fontSize: '34px', fontWeight: 600 }}>
                    {truncate(entry.organisation.name, 38)}
                  </span>
                  <span style={{ fontSize: '24px', color: OG_COLORS.ink2 }}>
                    {`${formatShortDate(entry.statedAt)} · ${entry.typeLabel}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
        {slide.more > 0 && (
          <span style={{ fontSize: '26px', color: OG_COLORS.ink2 }}>
            {`et ${slide.more} ${plural(slide.more, 'autre', 'autres')}`}
          </span>
        )}
      </div>
    </CarouselFrame>
  )
}
