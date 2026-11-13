import Link from 'next/link'
import { FigureSpotlight } from '../../../domain/read-models/figure-spotlight'
import { figureOnSubjectHref } from '../../../domain/read-models/hrefs'
import styles from './RandomFigure.module.css'

interface SpotlightSubjectsProps {
  figureSlug: string
  latest: FigureSpotlight['latest']
}

/** Les derniers sujets sur lesquels elle a pris position, chacun avec la position qu'elle y tient. */
export default function SpotlightSubjects({ figureSlug, latest }: SpotlightSubjectsProps) {
  if (latest.length === 0) return null

  return (
    <div className={styles.subjects}>
      <h3 className={styles.subjectsTitle}>Ses dernières prises de position</h3>
      <ul className={styles.subjectsList}>
        {latest.map((taken) => (
          <li key={taken.subjectSlug} className={styles.subject}>
            <Link
              href={figureOnSubjectHref(figureSlug, taken.subjectSlug)}
              className={styles.subjectLink}
            >
              {taken.subjectTitle}
            </Link>
            <span className={styles.position}>
              {taken.positionTitle} · {taken.year}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
