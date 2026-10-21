import Link from 'next/link'
import { SubjectActivitySummary } from '../../../domain/repositories/subject-repository'
import styles from './ActiveSubjects.module.css'

interface ActiveSubjectsProps {
  subjects: SubjectActivitySummary[]
}

/** Les sujets où l'on prend le plus position, en rail du flux. */
export default function ActiveSubjects({ subjects }: ActiveSubjectsProps) {
  if (subjects.length === 0) return null

  return (
    <section>
      <h2 className={styles.title}>Sujets actifs</h2>
      <ul className={styles.list}>
        {subjects.map((subject) => (
          <li key={subject.id} className={styles.item}>
            <Link href={`/s/${subject.slug}`} className={styles.subject}>
              {subject.title}
            </Link>
            <span className={styles.count}>{subject.statementsCount}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
