import Link from 'next/link'
import AuthorAvatar from '../../../../components/statements/AuthorAvatar'
import ArgumentChips from '../../../../components/statements/ArgumentChips'
import StatementSource from '../../../../components/statements/StatementSource'
import { authorHref } from '../../../../domain/read-models/statement-author'
import { TimelineEntry, TimelineYear } from '../../../../domain/services/subject-timeline'
import { plural } from '../../../../lib/plural'
import styles from './SubjectTimeline.module.css'

interface SubjectTimelineProps {
  subjectSlug: string
  years: TimelineYear[]
}

const yearSummary = (year: TimelineYear) =>
  [
    `${year.entries.length} ${plural(year.entries.length, 'prise de position', 'prises de position')}`,
    `${year.authorsCount} ${plural(year.authorsCount, 'auteur·ice', 'auteur·ices')}`,
    `${year.positionsCount} ${plural(year.positionsCount, 'position', 'positions')}`,
  ].join(' · ')

function Entry({ entry, subjectSlug }: { entry: TimelineEntry; subjectSlug: string }) {
  return (
    <li className={styles.entry}>
      <AuthorAvatar author={entry.author} size={44} />
      <div className={styles.body}>
        <p className={styles.head}>
          <Link href={authorHref(entry.author)} className={styles.name}>
            {entry.author.name}
          </Link>
          <span className={styles.for}>
            pour{' '}
            <Link
              href={`/s/${subjectSlug}/position/${entry.position.slug}`}
              className={styles.position}
            >
              {entry.position.title}
            </Link>
          </span>
        </p>
        <blockquote className={styles.quote}>{entry.quote}</blockquote>
        <StatementSource statement={entry} />
        <ArgumentChips arguments={entry.arguments} />
      </div>
    </li>
  )
}

/**
 * Onglet Chronologie d'un sujet : les prises de position dans l'ordre où
 * elles ont été énoncées, des plus récentes aux plus anciennes, année par année.
 */
export default function SubjectTimeline({ subjectSlug, years }: SubjectTimelineProps) {
  if (years.length === 0) {
    return (
      <p className={styles.empty}>
        La chronologie apparaîtra avec la première prise de position sur ce sujet.
      </p>
    )
  }

  return (
    <div className={styles.timeline}>
      {years.map((year) => (
        <section key={year.year} className={styles.year} aria-labelledby={`year-${year.year}`}>
          <header className={styles.yearHead}>
            <h3 id={`year-${year.year}`} className={styles.yearTitle}>
              {year.year}
            </h3>
            <p className={styles.yearMeta}>{yearSummary(year)}</p>
          </header>
          <ol className={styles.entries}>
            {year.entries.map((entry) => (
              <Entry key={entry.statementId} entry={entry} subjectSlug={subjectSlug} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
