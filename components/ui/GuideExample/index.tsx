import styles from './GuideExample.module.css'

interface GuideExampleProps {
  good: string
  bad?: string
}

export default function GuideExample({ good, bad }: GuideExampleProps) {
  return (
    <p className={styles.example}>
      <span className={styles.good}>{good}</span>
      {bad && (
        <>
          {' '}
          <span className={styles.bad}>{bad}</span>
        </>
      )}
    </p>
  )
}
