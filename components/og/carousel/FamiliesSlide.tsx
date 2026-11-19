import { SlideOf } from '../../../domain/read-models/subject-carousel'
import { OG_COLORS } from '../../../lib/og'
import CarouselFrame, { SlideChrome } from './CarouselFrame'
import CarouselHeading from './CarouselHeading'
import CarouselLegend from './CarouselLegend'
import FamilyBar from './FamilyBar'
import { body } from './styles'

interface FamiliesSlideProps {
  slide: SlideOf<'families'>
  chrome: SlideChrome
}

/** How each family of occupations splits across the positions, under how everyone does */
export default function FamiliesSlide({ slide, chrome }: FamiliesSlideProps) {
  return (
    <CarouselFrame chrome={chrome} note="À droite : le nombre de voix">
      <CarouselHeading
        title="Vers où penche chaque métier"
        lead="Part de chaque famille de métiers qui défend chaque position"
      />
      <CarouselLegend entries={slide.positions} />
      <div style={body(24)}>
        <FamilyBar family={slide.overall} />
        <div style={{ height: '2px', flexShrink: 0, backgroundColor: OG_COLORS.line }} />
        {slide.rows.map((family) => (
          <FamilyBar key={family.name} family={family} />
        ))}
      </div>
    </CarouselFrame>
  )
}
