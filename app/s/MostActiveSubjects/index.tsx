import { SubjectIndexEntry } from '../../../domain/read-models/subject-index'
import CompactSubjectCard from '../CompactSubjectCard'
import styles from './MostActiveSubjects.module.css'

interface MostActiveSubjectsProps {
  /** Already sorted: those the most voices spoke on lately first */
  subjects: SubjectIndexEntry[]
}

/**
 * La vue plate de l'index : tous les sujets, de celui où le plus de voix se
 * sont exprimées ces trente derniers jours à ceux où personne ne s'est
 * exprimé depuis.
 */
export default function MostActiveSubjects({ subjects }: MostActiveSubjectsProps) {
  return (
    <div className={styles.grid}>
      {subjects.map((subject) => (
        <CompactSubjectCard key={subject.id} subject={subject} />
      ))}
    </div>
  )
}
