import { CourseSummary, courseTitle } from '../../../domain/read-models/author-course'
import { dayKey } from '../../../domain/value-objects/day'
import { formatShortDate } from '../../../lib/format-date'
import CourseStep from './CourseStep'
import styles from './PositionCourse.module.css'

interface PositionCourseProps {
  summary: CourseSummary
}

/** « 2 mars 2017 → 25 avr. 2019 », or the one day when she stated it once */
const stretch = (since: Date, until: Date) =>
  dayKey(since) === dayKey(until)
    ? formatShortDate(since)
    : `${formatShortDate(since)} → ${formatShortDate(until)}`

const since = (day: Date) => `depuis le ${formatShortDate(day)}`

/**
 * Le parcours de l'auteur sur le sujet : une position quittée pour une autre,
 * ou plusieurs positions tenues ensemble. Un constat daté, rien de plus.
 */
export default function PositionCourse({ summary }: PositionCourseProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{courseTitle(summary)}</h2>
      {summary.kind === 'changed' ? (
        <ol className={styles.steps}>
          <CourseStep
            title={summary.from.title}
            when={stretch(summary.from.since, summary.from.until)}
            left
          />
          <li className={styles.link} aria-hidden="true">
            →
          </li>
          <CourseStep title={summary.to.title} when={since(summary.to.since)} />
        </ol>
      ) : (
        <ul className={styles.steps}>
          {summary.positions.map((position, index) => (
            <CourseStep
              key={position.title}
              title={position.title}
              when={since(position.since)}
              joined={index > 0}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
