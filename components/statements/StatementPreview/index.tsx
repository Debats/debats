'use client'

import { STATEMENT_TYPE_LABELS } from '../../../domain/entities/statement'
import { formatShortDate } from '../../../lib/format-date'
import { useStatementDraft } from '../StatementDraft'
import styles from './StatementPreview.module.css'

function initials(name: string): string {
  return name
    .split(/[\s-]+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

function parseDate(value: string): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Aperçu de la prise de position telle qu'elle apparaîtra sur le site. */
export default function StatementPreview() {
  const { draft } = useStatementDraft()
  const isEmpty = !draft.authorName && !draft.quote && !draft.positionTitle
  const date = parseDate(draft.statedAt)
  const isOrganisation = draft.authorKind === 'organisation'

  return (
    <aside className={styles.card} aria-live="polite">
      <p className={styles.title}>Aperçu</p>
      {isEmpty ? (
        <p className={styles.empty}>L’aperçu se remplit au fur et à mesure de votre saisie.</p>
      ) : (
        <>
          <div className={styles.head}>
            <span
              className={isOrganisation ? `${styles.avatar} ${styles.avatarOrg}` : styles.avatar}
              aria-hidden="true"
            >
              {initials(draft.authorName || '?')}
            </span>
            <p className={styles.text}>
              <strong className={styles.name}>
                {draft.authorName || (isOrganisation ? 'Une organisation' : 'Une personnalité')}
              </strong>
              <br />
              pour <em>{draft.positionTitle || '…'}</em>
              {draft.subjectTitle && (
                <>
                  {' '}
                  sur <em>{draft.subjectTitle}</em>
                </>
              )}
            </p>
          </div>
          {draft.quote && <blockquote className={styles.quote}>{draft.quote}</blockquote>}
          <p className={styles.meta}>
            {[
              STATEMENT_TYPE_LABELS[draft.statementType],
              date ? formatShortDate(date) : null,
              draft.sourceName || null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </>
      )}
    </aside>
  )
}
