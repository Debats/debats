import { SubjectActivitySummary } from '../../domain/repositories/subject-repository'
import SubjectCardCompact from '../SubjectCardCompact'
import styles from './SubjectSection.module.css'

interface SubjectSectionProps {
  title: string
  subjects: SubjectActivitySummary[]
}

export default function SubjectSection({ title, subjects }: SubjectSectionProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{title}</h2>
      {subjects.length === 0 ? (
        <p className={styles.empty}>Aucun sujet pour le moment.</p>
      ) : (
        <div className={styles.grid}>
          {subjects.map((subject) => (
            <SubjectCardCompact key={subject.id} subject={subject} />
          ))}
        </div>
      )}
    </section>
  )
}
