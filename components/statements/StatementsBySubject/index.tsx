import Link from 'next/link'
import EditLink from '../../ui/EditLink'
import NavSelect from '../../ui/NavSelect'
import ArgumentChips from '../ArgumentChips'
import StatementBody from '../StatementBody'
import StatementSource from '../StatementSource'
import Segmented from '../../ui/Segmented'
import ShowMore from '../../ui/ShowMore'
import { Theme } from '../../../domain/entities/theme'
import { StatementsOrder, StatementsView } from '../../../domain/read-models/statements-view'
import { StatementWithDetails } from '../../../domain/repositories/statement-repository'
import { groupStatementsBySubject } from '../../../domain/services/statements-by-subject'
import { groupStatementsByYear } from '../../../domain/services/statements-by-year'
import { plural } from '../../../lib/plural'
import styles from './StatementsBySubject.module.css'

const ORDER_LABELS: Record<StatementsOrder, string> = {
  subject: 'Par sujet',
  date: 'Chronologique',
}

interface StatementsBySubjectProps {
  /** The statements to show, already narrowed to the theme of the view */
  statements: StatementWithDetails[]
  view: StatementsView
  /** The themes one can narrow to */
  themes: Theme[]
  /** Où mène le titre d'un sujet : la page de l'auteur sur ce sujet, ou le sujet lui-même */
  subjectHref: (subjectSlug: string) => string
  /** L'adresse de la page pour une autre vue */
  viewHref: (view: StatementsView) => string
  /** Lien de modification d'une prise de position, quand l'utilisateur y a droit */
  editHref?: (statementId: string) => string
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
      <StatementBody content={statement.content} />
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
  view,
  themes,
  subjectHref,
  viewHref,
  editHref,
}: StatementsBySubjectProps) {
  const { order } = view
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
            { label: ORDER_LABELS.subject, href: viewHref({ ...view, order: 'subject' }) },
            { label: ORDER_LABELS.date, href: viewHref({ ...view, order: 'date' }) },
          ]}
        />
        <NavSelect
          ariaLabel="Thème"
          any={{ label: 'Tous les thèmes', href: viewHref({ ...view, themeSlug: undefined }) }}
          options={themes.map((theme) => ({
            value: theme.slug,
            label: theme.name,
            href: viewHref({ ...view, themeSlug: theme.slug }),
          }))}
          value={view.themeSlug}
        />
      </div>

      {statements.length === 0 ? (
        <p className={styles.empty}>
          {view.themeSlug
            ? 'Aucune prise de position sur ce thème pour l’instant.'
            : 'Aucune prise de position enregistrée pour l’instant.'}
        </p>
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
