import DatedStatement from '../../../../components/statements/DatedStatement'
import { TimelineYear } from '../../../../domain/services/subject-timeline'
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
          {year.entries.map((entry) => (
            <DatedStatement
              key={entry.statementId}
              author={entry.author}
              position={{
                title: entry.position.title,
                href: `/s/${subjectSlug}/position/${entry.position.slug}`,
              }}
              statement={entry}
              arguments={entry.arguments}
            />
          ))}
        </section>
      ))}
    </div>
  )
}
