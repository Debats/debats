import { CarouselSlide } from '../../../domain/read-models/subject-carousel'
import { SlideFaces } from '../../../lib/carousel-image'
import BalanceSlide from './BalanceSlide'
import CallSlide from './CallSlide'
import { SlideChrome } from './CarouselFrame'
import CoverSlide from './CoverSlide'
import CurvesSlide from './CurvesSlide'
import FaceOffSlide from './FaceOffSlide'
import FacesSlide from './FacesSlide'
import FamiliesSlide from './FamiliesSlide'
import FamilySlide from './FamilySlide'
import JourneySlide from './JourneySlide'
import OrganisationsSlide from './OrganisationsSlide'
import QuoteSlide from './QuoteSlide'
import RankingSlide from './RankingSlide'

interface CarouselSlideImageProps {
  slide: CarouselSlide
  chrome: SlideChrome
  faces: SlideFaces
  qrCode: string
}

/** One slide of the carousel of a subject, drawn as its kind asks */
export default function CarouselSlideImage({
  slide,
  chrome,
  faces,
  qrCode,
}: CarouselSlideImageProps) {
  switch (slide.kind) {
    case 'cover':
      return <CoverSlide slide={slide} chrome={chrome} faces={faces} />
    case 'ranking':
      return <RankingSlide slide={slide} chrome={chrome} />
    case 'faces':
      return <FacesSlide slide={slide} chrome={chrome} faces={faces} />
    case 'quote':
      return <QuoteSlide slide={slide} chrome={chrome} faces={faces} />
    case 'face-off':
      return <FaceOffSlide slide={slide} chrome={chrome} faces={faces} />
    case 'families':
      return <FamiliesSlide slide={slide} chrome={chrome} />
    case 'journey':
      return <JourneySlide slide={slide} chrome={chrome} faces={faces} />
    case 'organisations':
      return <OrganisationsSlide slide={slide} chrome={chrome} faces={faces} />
    case 'curves':
      return <CurvesSlide slide={slide} chrome={chrome} />
    case 'balance':
      return <BalanceSlide slide={slide} chrome={chrome} />
    case 'family':
      return <FamilySlide slide={slide} chrome={chrome} faces={faces} />
    case 'call':
      return <CallSlide slide={slide} chrome={chrome} qrCode={qrCode} />
  }
}
