import { FigureAffiliations } from '../../../../domain/services/figure-affiliations'
import CurrentEngagement from './CurrentEngagement'
import FormerEngagement from './FormerEngagement'
import styles from './FigureEngagements.module.css'

interface FigureEngagementsProps {
  affiliations: FigureAffiliations
  /** The day the page renders on: what the period labels are read against */
  today: Date
}

/**
 * The card of a figure's rail: her affiliations, which the page calls her
 * engagements. The running ones stand as equals, at the top; the ones that
 * have ended form a thread, from the most recent to the oldest.
 */
export default function FigureEngagements({
  affiliations: { current, former },
  today,
}: FigureEngagementsProps) {
  if (current.length === 0 && former.length === 0) return null

  return (
    <div className={styles.card}>
      <p className={styles.title}>Engagements</p>

      {current.length > 0 && (
        <ul className={styles.current}>
          {current.map((affiliation) => (
            <CurrentEngagement
              key={affiliation.membership.id}
              affiliation={affiliation}
              today={today}
            />
          ))}
        </ul>
      )}

      {former.length > 0 && (
        <ol className={styles.former}>
          {former.map((affiliation) => (
            <FormerEngagement
              key={affiliation.membership.id}
              affiliation={affiliation}
              today={today}
            />
          ))}
        </ol>
      )}
    </div>
  )
}
