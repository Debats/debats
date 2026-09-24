import Link from 'next/link'
import FigureAvatarStack from '../../../../components/figures/FigureAvatarStack'
import { PositionSummary } from '../../../../domain/read-models/subject-positions-summary'
import { positionAnchor } from '../position-anchor'
import styles from './PositionsOverview.module.css'

interface PositionsOverviewProps {
  positions: PositionSummary[]
}

/**
 * Vue d'ensemble des positions d'un sujet : une vignette par position, de la
 * plus à la moins soutenue, la première en encre. Chaque vignette renvoie à la
 * carte détaillée plus bas dans la page.
 */
export default function PositionsOverview({ positions }: PositionsOverviewProps) {
  if (positions.length === 0) return null

  const hint =
    positions.length > 1
      ? `${positions.length} positions, de la plus à la moins soutenue`
      : 'Une seule position pour l’instant'

  return (
    <div className={styles.overview}>
      <div className={styles.head}>
        <p className={styles.label}>
          Qui pense quoi ? <span className={styles.hint}>{hint}</span>
        </p>
        <Link href="#comment-lire" className={styles.help}>
          Comment lire cette page ?
        </Link>
      </div>
      <div className={styles.nodes}>
        {positions.map((position, index) => (
          <Link
            key={position.positionId}
            href={`#${positionAnchor(position.positionSlug)}`}
            className={index === 0 ? `${styles.node} ${styles.nodeMain}` : styles.node}
          >
            <FigureAvatarStack
              figures={position.figures}
              totalCount={position.totalFiguresCount}
              max={5}
              size={32}
              linked={false}
            />
            <span className={styles.count}>{position.totalFiguresCount}</span>
            <span className={styles.title}>{position.positionTitle}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
