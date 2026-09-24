import Link from 'next/link'
import ComingSoon from '../../../../components/ui/ComingSoon'
import Segmented from '../../../../components/ui/Segmented'
import ShowMore from '../../../../components/ui/ShowMore'
import { STATEMENT_TYPE_LABELS } from '../../../../domain/entities/statement'
import { StatementWithDetails } from '../../../../domain/repositories/statement-repository'
import { formatShortDate } from '../../../../lib/format-date'
import styles from './FigureStatements.module.css'

export interface SubjectGroup {
  subject: StatementWithDetails['subject']
  entries: Array<{
    statement: StatementWithDetails['statement']
    position: StatementWithDetails['position']
  }>
}

interface FigureStatementsProps {
  figureSlug: string
  groups: SubjectGroup[]
}

function ChevronIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

/** Nombre de sujets affichés avant le bouton « Voir les autres sujets » */
const INITIAL_SUBJECTS = 5

function moreSubjectsLabel(hidden: number) {
  return hidden === 1 ? 'Voir le dernier sujet' : `Voir les ${hidden} autres sujets`
}

/** Les prises de position d'une personnalité, groupées par sujet. */
export default function FigureStatements({ figureSlug, groups }: FigureStatementsProps) {
  const subjectItems = groups.map(({ subject, entries }) => (
    <article key={subject.id} className={styles.subject}>
      <Link href={`/p/${figureSlug}/s/${subject.slug}`} className={styles.subjectTitle}>
        {subject.title}
      </Link>
      {entries.map(({ statement, position }) => (
        <div key={statement.id} className={styles.entry}>
          <p className={styles.position}>
            <span className={styles.positionLabel}>Position</span>
            <span className={styles.positionTitle}>{position.title}</span>
          </p>
          <blockquote className={styles.quote}>{statement.quote}</blockquote>
          <div className={styles.source}>
            <span className={styles.type}>{STATEMENT_TYPE_LABELS[statement.statementType]}</span>
            {statement.sourceUrl ? (
              <a
                href={statement.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.sourceLink}
              >
                {statement.sourceName}
              </a>
            ) : (
              <span className={styles.sourceLink}>{statement.sourceName}</span>
            )}
            <span className={styles.separator}>·</span>
            <span className={styles.date}>{formatShortDate(statement.statedAt)}</span>
          </div>
        </div>
      ))}
    </article>
  ))

  return (
    <section>
      <div className={styles.toolbar}>
        <Segmented
          ariaLabel="Organiser les prises de position"
          active="Par sujet"
          items={[
            { label: 'Par sujet' },
            { label: 'Chronologique', soon: true },
            { label: 'Par thème', soon: true },
          ]}
        />
        <ComingSoon>
          <span className={styles.select}>
            Tous les thèmes
            <ChevronIcon />
          </span>
        </ComingSoon>
      </div>

      {groups.length === 0 ? (
        <p className={styles.empty}>Aucune prise de position enregistrée pour l’instant.</p>
      ) : (
        <div className={styles.card}>
          <ShowMore
            items={subjectItems}
            initialCount={INITIAL_SUBJECTS}
            moreLabel={moreSubjectsLabel(groups.length - INITIAL_SUBJECTS)}
          />
        </div>
      )}
    </section>
  )
}
