import Link from 'next/link'
import ComingSoon from '../../ui/ComingSoon'
import EditLink from '../../ui/EditLink'
import ArgumentChips from '../ArgumentChips'
import StatementSource from '../StatementSource'
import Segmented from '../../ui/Segmented'
import ShowMore from '../../ui/ShowMore'
import { StatementWithDetails } from '../../../domain/repositories/statement-repository'
import { groupStatementsBySubject } from '../../../domain/services/statements-by-subject'
import { groupStatementsByYear } from '../../../domain/services/statements-by-year'
import { plural } from '../../../lib/plural'
import styles from './StatementsBySubject.module.css'

/** How an author's statements are organised: by subject, or in the order they were stated */
export type StatementsOrder = 'subject' | 'date'

/** The `tri` parameter of an author's page */
export const ORDER_PARAM = 'tri'
const DATE_PARAM_VALUE = 'chronologique'

export const parseStatementsOrder = (value: string | undefined): StatementsOrder =>
  value === DATE_PARAM_VALUE ? 'date' : 'subject'

/** The address of an author's page in the given order */
export const orderedHref = (base: string, order: StatementsOrder): string =>
  order === 'date' ? `${base}?${ORDER_PARAM}=${DATE_PARAM_VALUE}` : base

const ORDER_LABELS: Record<StatementsOrder, string> = {
  subject: 'Par sujet',
  date: 'Chronologique',
}

interface StatementsBySubjectProps {
  statements: StatementWithDetails[]
  order: StatementsOrder
  /** Où mène le titre d'un sujet : la page de l'auteur sur ce sujet, ou le sujet lui-même */
  subjectHref: (subjectSlug: string) => string
  /** L'adresse de la page dans l'autre organisation */
  orderHref: (order: StatementsOrder) => string
  /** Lien de modification d'une prise de position, quand l'utilisateur y a droit */
  editHref?: (statementId: string) => string
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
/** Nombre d'années affichées avant le bouton « Voir les années précédentes » */
const INITIAL_YEARS = 3

const moreSubjectsLabel = (hidden: number) =>
  hidden === 1 ? 'Voir le dernier sujet' : `Voir les ${hidden} autres sujets`

const moreYearsLabel = (hidden: number) =>
  hidden === 1 ? 'Voir l’année précédente' : `Voir les ${hidden} années précédentes`

const yearSummary = (entries: StatementWithDetails[]) => {
  const subjects = new Set(entries.map((e) => e.subject.id)).size
  return [
    `${entries.length} ${plural(entries.length, 'prise de position', 'prises de position')}`,
    `${subjects} ${plural(subjects, 'sujet', 'sujets')}`,
  ].join(' · ')
}

function Entry({
  entry,
  editHref,
}: {
  entry: Pick<StatementWithDetails, 'statement' | 'position' | 'arguments'>
  editHref?: (statementId: string) => string
}) {
  const { statement, position, arguments: used } = entry
  return (
    <div className={styles.entry}>
      <p className={styles.position}>
        <span className={styles.positionLabel}>Position</span>
        <span className={styles.positionTitle}>{position.title}</span>
      </p>
      <blockquote className={styles.quote}>{statement.quote}</blockquote>
      <StatementSource statement={statement}>
        {editHref && <EditLink href={editHref(statement.id)} />}
      </StatementSource>
      <ArgumentChips arguments={used} />
    </div>
  )
}

/**
 * Les prises de position d'un auteur (personnalité ou organisation), groupées
 * par sujet ou dans l'ordre où elles ont été énoncées, année par année.
 */
export default function StatementsBySubject({
  statements,
  order,
  subjectHref,
  orderHref,
  editHref,
}: StatementsBySubjectProps) {
  const bySubject = groupStatementsBySubject(statements).map(({ subject, entries }) => (
    <article key={subject.id} className={styles.subject}>
      <Link href={subjectHref(subject.slug)} className={styles.subjectTitle}>
        {subject.title}
      </Link>
      {entries.map((entry) => (
        <Entry key={entry.statement.id} entry={entry} editHref={editHref} />
      ))}
    </article>
  ))

  const byYear = groupStatementsByYear(statements).map(({ year, entries }) => (
    <section key={year} className={styles.year} aria-labelledby={`year-${year}`}>
      <header className={styles.yearHead}>
        <h3 id={`year-${year}`} className={styles.yearTitle}>
          {year}
        </h3>
        <p className={styles.yearMeta}>{yearSummary(entries)}</p>
      </header>
      {entries.map((entry) => (
        <article key={entry.statement.id} className={styles.dated}>
          <Link href={subjectHref(entry.subject.slug)} className={styles.datedSubject}>
            {entry.subject.title}
          </Link>
          <Entry entry={entry} editHref={editHref} />
        </article>
      ))}
    </section>
  ))

  return (
    <section>
      <div className={styles.toolbar}>
        <Segmented
          ariaLabel="Organiser les prises de position"
          active={ORDER_LABELS[order]}
          items={[
            { label: ORDER_LABELS.subject, href: orderHref('subject') },
            { label: ORDER_LABELS.date, href: orderHref('date') },
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

      {statements.length === 0 ? (
        <p className={styles.empty}>Aucune prise de position enregistrée pour l’instant.</p>
      ) : order === 'date' ? (
        <div className={styles.card}>
          <ShowMore
            items={byYear}
            initialCount={INITIAL_YEARS}
            moreLabel={moreYearsLabel(byYear.length - INITIAL_YEARS)}
          />
        </div>
      ) : (
        <div className={styles.card}>
          <ShowMore
            items={bySubject}
            initialCount={INITIAL_SUBJECTS}
            moreLabel={moreSubjectsLabel(bySubject.length - INITIAL_SUBJECTS)}
          />
        </div>
      )}
    </section>
  )
}
