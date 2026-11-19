import Image from 'next/image'
import { SLIDE_SIZE } from '../../../../lib/carousel-image'
import { ShareSlide } from '../../../actions/list-share-slides'
import styles from './SubjectShare.module.css'

interface SlideStripProps {
  /** The title of the subject, for the alternative texts */
  title: string
  slides: ShareSlide[]
  /** Hands over the download link of each slide as it mounts, and null as it leaves */
  onLink: (key: string, link: HTMLAnchorElement | null) => void
}

/** The slides of the carousel side by side, in the order they are swiped; each one is saved alone by a click */
export default function SlideStrip({ title, slides, onLink }: SlideStripProps) {
  return (
    <ol className={styles.strip}>
      {slides.map((slide, index) => (
        <li key={slide.key} className={styles.slide}>
          <a
            ref={(link) => onLink(slide.key, link)}
            href={slide.href}
            download={slide.fileName}
            title="Télécharger cette image"
          >
            <Image
              src={slide.href}
              alt={`${title} : ${slide.label}`}
              {...SLIDE_SIZE}
              unoptimized
              loading="lazy"
              className={styles.image}
            />
          </a>
          <span className={styles.caption}>
            <span className={styles.rank}>{`${index + 1}/${slides.length}`}</span> {slide.label}
          </span>
        </li>
      ))}
    </ol>
  )
}
