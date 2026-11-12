import Link from 'next/link'
import {
  createdPhrase,
  DRAFT_STATUS_LABELS,
  DraftStatement,
} from '../../../../domain/entities/draft-statement'
import {
  authorOnSubjectHref,
  StatementWhereabouts,
} from '../../../../domain/read-models/statement-author'
import styles from './SettledDrafts.module.css'

interface SettledDraftsProps {
  /** The drafts of the chantier that are no longer waiting: validated, rejected, sent back */
  drafts: DraftStatement[]
  /**
   * Where the statement a validation put online stands, by statement id; a
   * statement that is no longer found has no page, and its draft no link
   */
  whereabouts: ReadonlyMap<string, StatementWhereabouts>
}

/** A statement has no page of its own: it is read on its author's page on its subject */
const pageOf = ({ author, subjectSlug }: StatementWhereabouts) =>
  authorOnSubjectHref(author, subjectSlug)

/**
 * What the chantier already settled, as a list that offers nothing to do:
 * the review cards are for pending drafts, and validating twice would write
 * twice.
 */
export default function SettledDrafts({ drafts, whereabouts }: SettledDraftsProps) {
  if (drafts.length === 0) return null

  return (
    <section className={styles.settled} aria-label="Brouillons déjà traités">
      <h2 className={styles.heading}>Déjà traités</h2>
      <ul className={styles.list}>
        {drafts.map((draft) => {
          const found = draft.validation && whereabouts.get(draft.validation.statementId)
          return (
            <li key={draft.id} className={styles.item}>
              <span className={styles.who}>
                {draft.author.name}
                <span className={styles.position}> · {draft.positionTitle}</span>
              </span>
              <span className={`${styles.status} ${styles[draft.status]}`}>
                {draft.validation ? (
                  <>
                    {found ? (
                      <Link href={pageOf(found)} className={styles.link}>
                        {DRAFT_STATUS_LABELS.validated}
                      </Link>
                    ) : (
                      DRAFT_STATUS_LABELS.validated
                    )}
                    <span className={styles.created}>
                      {' · '}
                      {createdPhrase(draft.validation.created)}
                    </span>
                  </>
                ) : (
                  DRAFT_STATUS_LABELS[draft.status]
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
