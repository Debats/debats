import styles from './subject-counters.module.css'

interface SubjectCountersProps {
  positionsCount: number
  publicFiguresCount: number
}

export default function SubjectCounters({
  positionsCount,
  publicFiguresCount,
}: SubjectCountersProps) {
  return (
    <div className={styles.counters}>
      <span className={styles.countItem}>
        {positionsCount} position{positionsCount !== 1 ? 's' : ''}
      </span>
      <span className={styles.countItem}>
        {publicFiguresCount} personnalité{publicFiguresCount !== 1 ? 's' : ''} active
        {publicFiguresCount !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
