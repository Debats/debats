import { SlideOf } from '../../../domain/read-models/subject-carousel'
import { SlideFaces } from '../../../lib/carousel-image'
import CarouselFrame, { SlideChrome } from './CarouselFrame'
import CarouselHeading from './CarouselHeading'
import QuoteCard from './QuoteCard'
import { body } from './styles'

interface FaceOffSlideProps {
  slide: SlideOf<'face-off'>
  chrome: SlideChrome
  faces: SlideFaces
}

/** The two most supported positions, each in the words of one of its own, said the same year */
export default function FaceOffSlide({ slide, chrome, faces }: FaceOffSlideProps) {
  return (
    <CarouselFrame chrome={chrome} note="Le site ne dit pas qui a raison">
      <CarouselHeading title={`Deux voix en ${slide.year}`} />
      <div style={body(28)}>
        <QuoteCard quote={slide.quotes[0]} faces={faces} />
        <QuoteCard quote={slide.quotes[1]} faces={faces} mirrored />
      </div>
    </CarouselFrame>
  )
}
