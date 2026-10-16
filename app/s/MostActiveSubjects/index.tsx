import { SubjectIndexEntry } from '../../../domain/read-models/subject-index'
import CompactSubjectCard from '../CompactSubjectCard'
import styles from './MostActiveSubjects.module.css'

interface MostActiveSubjectsProps {
  /** Already sorted, the most documented first */
  subjects: SubjectIndexEntry[]
}

/** La vue plate de l'index : tous les sujets, du plus au moins documenté. */
export default function MostActiveSubjects({ subjects }: MostActiveSubjectsProps) {
  return (
    <div className={styles.grid}>
      {subjects.map((subject) => (
        <CompactSubjectCard key={subject.id} subject={subject} />
      ))}
    </div>
  )
}
