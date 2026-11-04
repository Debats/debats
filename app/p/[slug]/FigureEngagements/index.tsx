import { Engagements } from '../../../../domain/services/figure-engagements'
import CurrentEngagement from './CurrentEngagement'
import PastEngagement from './PastEngagement'
import styles from './FigureEngagements.module.css'

interface FigureEngagementsProps {
  engagements: Engagements
}

/**
 * Carte du rail d'une personnalité : ses affiliations. Les engagements en
 * cours sont à égalité, en tête ; ceux qui ont pris fin forment une frise,
 * du plus récent au plus ancien.
 */
export default function FigureEngagements({
  engagements: { current, past },
}: FigureEngagementsProps) {
  if (current.length === 0 && past.length === 0) return null

  return (
    <div className={styles.card}>
      <p className={styles.title}>Engagements</p>

      {current.length > 0 && (
        <ul className={styles.current}>
          {current.map((engagement) => (
            <CurrentEngagement key={engagement.membership.id} engagement={engagement} />
          ))}
        </ul>
      )}

      {past.length > 0 && (
        <ol className={styles.past}>
          {past.map((engagement) => (
            <PastEngagement key={engagement.membership.id} engagement={engagement} />
          ))}
        </ol>
      )}
    </div>
  )
}
