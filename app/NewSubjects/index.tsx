import Link from 'next/link'
import { Debate } from '../../domain/read-models/home-debates'
import { subjectHref, SUBJECTS_HREF } from '../../domain/read-models/hrefs'
import { formatShortDate } from '../../lib/format-date'
import RailSection from '../RailSection'
import styles from './NewSubjects.module.css'

/** Les sujets ouverts en dernier, dans le rail de l'accueil : leur titre, le jour de leur ouverture. */
export default function NewSubjects({ subjects }: { subjects: Debate[] }) {
  if (subjects.length === 0) return null

  return (
    <RailSection title="Nouveaux sujets" more={{ href: SUBJECTS_HREF, label: 'Tous les sujets' }}>
      <ul className={styles.list}>
        {subjects.map((subject) => (
          <li key={subject.id} className={styles.entry}>
            <Link href={subjectHref(subject.slug)} className={styles.title}>
              {subject.title}
            </Link>
            <span className={styles.date}>{formatShortDate(subject.createdAt)}</span>
          </li>
        ))}
      </ul>
    </RailSection>
  )
}
