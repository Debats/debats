import Link from 'next/link'
import { SubjectIndexEntry } from '../../../domain/read-models/subject-index'
import { subjectCountsLabel } from '../../../lib/subject-counts'
import styles from './CompactSubjectCard.module.css'

interface CompactSubjectCardProps {
  subject: SubjectIndexEntry
}

/** Un sujet de l'index en une ligne de titre et ses compteurs. */
export default function CompactSubjectCard({ subject }: CompactSubjectCardProps) {
  return (
    <Link href={`/s/${subject.slug}`} className={styles.card}>
      <span className={styles.title}>{subject.title}</span>
      <span className={styles.meta}>{subjectCountsLabel(subject)}</span>
    </Link>
  )
}
