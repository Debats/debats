import styles from './PositionCourse.module.css'

interface CourseStepProps {
  title: string
  /** « depuis le 17 mars 2022 », « 2 mars 2017 → 25 avr. 2019 » */
  when: string
  /** A position she no longer holds */
  left?: boolean
  /** Held with the one before: an « et » leads to it */
  joined?: boolean
}

/** One position of the author's course on the subject, and when she held it */
export default function CourseStep({ title, when, left, joined }: CourseStepProps) {
  return (
    <>
      {joined && (
        <li className={styles.link} aria-hidden="true">
          et
        </li>
      )}
      <li className={left ? `${styles.step} ${styles.stepLeft}` : styles.step}>
        <span className={styles.stepTitle}>{title}</span>
        <span className={styles.when}>{when}</span>
      </li>
    </>
  )
}
