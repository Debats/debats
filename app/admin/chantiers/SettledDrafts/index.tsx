import { DRAFT_STATUS_LABELS, DraftStatement } from '../../../../domain/entities/draft-statement'
import styles from './SettledDrafts.module.css'

interface SettledDraftsProps {
  /** The drafts of the chantier that are no longer waiting: validated, rejected, sent back */
  drafts: DraftStatement[]
}

/**
 * What the chantier already settled, as a list that offers nothing to do:
 * the review cards are for pending drafts, and validating twice would write
 * twice.
 */
export default function SettledDrafts({ drafts }: SettledDraftsProps) {
  if (drafts.length === 0) return null

  return (
    <section className={styles.settled} aria-label="Brouillons déjà traités">
      <h2 className={styles.heading}>Déjà traités</h2>
      <ul className={styles.list}>
        {drafts.map((draft) => (
          <li key={draft.id} className={styles.item}>
            <span className={styles.who}>
              {draft.author.name}
              <span className={styles.position}> · {draft.positionTitle}</span>
            </span>
            <span className={`${styles.status} ${styles[draft.status]}`}>
              {DRAFT_STATUS_LABELS[draft.status]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
