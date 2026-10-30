'use client'

import {
  parseStatementType,
  parseVoteChoice,
  STATEMENT_TYPE_LABELS,
  voteSense,
} from '../../../domain/entities/statement'
import { formatShortDate } from '../../../lib/format-date'
import { StatementDraft, useStatementDraft } from '../StatementDraft'
import styles from './StatementPreview.module.css'

/**
 * Ce que la saisie en cours dit, selon la nature choisie. Un vote et un acte
 * s'énoncent comme des faits : l'aperçu ne les met pas entre guillemets, pour
 * que l'auteur voie tout de suite ce que le site affichera.
 */
function draftSays(draft: StatementDraft): string {
  switch (parseStatementType(draft.statementType)) {
    case 'declaration':
    case 'program':
      return draft.quote
    case 'vote': {
      const choice = parseVoteChoice(draft.choice)
      const sense = choice ? voteSense(choice) : 'A voté'
      return draft.votedText ? `${sense} : ${draft.votedText}` : ''
    }
    case 'act':
      return draft.deed
  }
}

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
  const says = draftSays(draft)
  const isEmpty = !draft.authorName && !says && !draft.positionTitle
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
          {says &&
            (draft.statementType === 'vote' || draft.statementType === 'act' ? (
              <p className={styles.fact}>{says}</p>
            ) : (
              <blockquote className={styles.quote}>{says}</blockquote>
            ))}
          <p className={styles.meta}>
            {[
              STATEMENT_TYPE_LABELS[parseStatementType(draft.statementType)],
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
