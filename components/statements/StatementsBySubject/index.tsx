import Link from 'next/link'
import ComingSoon from '../../ui/ComingSoon'
import Segmented from '../../ui/Segmented'
import ShowMore from '../../ui/ShowMore'
import { STATEMENT_TYPE_LABELS } from '../../../domain/entities/statement'
import { SubjectGroup } from '../../../domain/services/statements-by-subject'
import { formatShortDate } from '../../../lib/format-date'
import styles from './StatementsBySubject.module.css'

interface StatementsBySubjectProps {
  groups: SubjectGroup[]
  /** Où mène le titre d'un sujet : la page de l'auteur sur ce sujet, ou le sujet lui-même */
  subjectHref: (subjectSlug: string) => string
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

/** Les prises de position d'un auteur (personnalité ou organisation), groupées par sujet. */
export default function StatementsBySubject({ groups, subjectHref }: StatementsBySubjectProps) {
  const subjectItems = groups.map(({ subject, entries }) => (
    <article key={subject.id} className={styles.subject}>
      <Link href={subjectHref(subject.slug)} className={styles.subjectTitle}>
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
