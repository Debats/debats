import { SubjectActivitySummary } from '../../domain/repositories/subject-repository'
import FigureAvatarRow from '../../components/figures/FigureAvatarRow'
import SubjectCounters from '../../components/subjects/SubjectCounters'
import SubjectTitle from '../../components/subjects/SubjectTitle'
import styles from './SubjectCardCompact.module.css'

export default function SubjectCardCompact({ subject }: { subject: SubjectActivitySummary }) {
  return (
    <div className={styles.card}>
      <SubjectTitle slug={subject.slug} title={subject.title} />
      <SubjectCounters
        positionsCount={subject.positionsCount}
        publicFiguresCount={subject.publicFiguresCount}
      />
      {subject.figures.length > 0 && (
        <FigureAvatarRow
          figures={subject.figures}
          totalCount={subject.publicFiguresCount}
          size={36}
        />
      )}
    </div>
  )
}
