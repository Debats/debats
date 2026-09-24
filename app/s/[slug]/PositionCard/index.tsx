import Link from 'next/link'
import FigureAvatarStack from '../../../../components/figures/FigureAvatarStack'
import { PositionSummary } from '../../../../domain/read-models/subject-positions-summary'
import { positionAnchor } from '../position-anchor'
import styles from './PositionCard.module.css'

interface PositionCardProps {
  position: PositionSummary
  subjectSlug: string
  /** La position la plus soutenue du sujet */
  featured?: boolean
}

export default function PositionCard({ position, subjectSlug, featured }: PositionCardProps) {
  const count = position.totalFiguresCount
  const countLabel = count === 1 ? 'personnalité' : 'personnalités'

  return (
    <article className={styles.card} id={positionAnchor(position.positionSlug)}>
      <div className={styles.head}>
        <div>
          {featured && <p className={styles.kicker}>La plus soutenue</p>}
          <h3 className={styles.title}>
            <Link
              href={`/s/${subjectSlug}/position/${position.positionSlug}`}
              className={styles.titleLink}
            >
              {position.positionTitle}
            </Link>
          </h3>
        </div>
        <p className={styles.count}>
          <span className={styles.countValue}>{count}</span>
          <span className={styles.countLabel}>{countLabel}</span>
        </p>
      </div>
      <p className={styles.description}>{position.positionDescription}</p>
      <div className={styles.foot}>
        <FigureAvatarStack
          figures={position.figures}
          totalCount={count}
          max={10}
          size={36}
          hrefSuffix={`/s/${subjectSlug}`}
        />
        <Link href={`/s/${subjectSlug}/position/${position.positionSlug}`} className={styles.more}>
          Voir les prises de position
        </Link>
      </div>
    </article>
  )
}
