import Link from 'next/link'
import FigureAvatarRow from '../../../../components/figures/FigureAvatarRow'
import { PositionSummary } from '../../../../domain/read-models/subject-positions-summary'
import styles from './PositionCard.module.css'

interface PositionCardProps {
  position: PositionSummary
  subjectSlug: string
}

export default function PositionCard({ position, subjectSlug }: PositionCardProps) {
  const count = position.totalFiguresCount
  const countLabel = count === 1 ? 'personnalité' : 'personnalités'

  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <h3 className={styles.title}>
          <Link
            href={`/s/${subjectSlug}/position/${position.positionSlug}`}
            className={styles.titleLink}
          >
            {position.positionTitle}
          </Link>
        </h3>
        <p className={styles.count}>
          <span className={styles.countValue}>{count}</span>
          <span className={styles.countLabel}>{countLabel}</span>
        </p>
      </div>
      <p className={styles.description}>{position.positionDescription}</p>
      <FigureAvatarRow
        figures={position.figures}
        totalCount={count}
        size={36}
        hrefSuffix={`/s/${subjectSlug}`}
      />
    </article>
  )
}
