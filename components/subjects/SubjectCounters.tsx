import styles from './subject-counters.module.css'

interface SubjectCountersProps {
  positionsCount: number
}

export default function SubjectCounters({ positionsCount }: SubjectCountersProps) {
  return (
    <span className={styles.counter}>
      {positionsCount} position{positionsCount !== 1 ? 's' : ''}
    </span>
  )
}
