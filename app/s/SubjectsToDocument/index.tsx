import Link from 'next/link'
import { SubjectIndexEntry } from '../../../domain/read-models/subject-index'
import { plural } from '../../../lib/plural'
import styles from './SubjectsToDocument.module.css'

interface SubjectsToDocumentProps {
  subjects: SubjectIndexEntry[]
}

/** « aucune », « 1 prise », « 2 prises » */
const statementsLabel = (count: number) =>
  count === 0 ? 'aucune' : `${count} ${plural(count, 'prise', 'prises')}`

/** Encart du rail : les sujets les moins documentés, qu'une citation sourcée suffit à enrichir. */
export default function SubjectsToDocument({ subjects }: SubjectsToDocumentProps) {
  if (subjects.length === 0) return null

  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Sujets à documenter</h2>
      <p className={styles.intro}>
        Ces sujets ont au plus deux prises de position. Une citation sourcée suffit pour les
        enrichir.
      </p>
      <ul className={styles.list}>
        {subjects.map((subject) => (
          <li key={subject.id} className={styles.item}>
            <Link href={`/s/${subject.slug}`} className={styles.subject}>
              {subject.title}
            </Link>
            <span className={styles.count}>{statementsLabel(subject.statementsCount)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
