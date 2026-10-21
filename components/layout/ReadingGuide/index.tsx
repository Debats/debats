import { ReactNode } from 'react'
import styles from './ReadingGuide.module.css'

interface ReadingGuideProps {
  title: string
  steps: ReactNode[]
  /** Pour qu'un lien de la page puisse y mener */
  id?: string
}

/** Encart pédagogique du rail : comment lire la page. */
export default function ReadingGuide({ title, steps, id }: ReadingGuideProps) {
  return (
    <aside className={styles.guide} id={id}>
      <p className={styles.title}>{title}</p>
      <ol className={styles.steps}>
        {steps.map((step, index) => (
          <li key={index} className={styles.step}>
            <span className={styles.index}>{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </aside>
  )
}
