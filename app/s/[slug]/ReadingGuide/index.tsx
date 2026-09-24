import styles from './ReadingGuide.module.css'

const steps = [
  <>
    Une <strong>position</strong> est une réponse possible à la problématique du sujet.
  </>,
  <>
    Une <strong>prise de position</strong> est une citation datée et sourcée d’une personnalité.
  </>,
  <>Le site ne dit pas qui a raison. Il montre qui dit quoi, et sur quelles bases.</>,
]

/** Encart pédagogique du rail : ce qu'on lit sur une page sujet. */
export default function ReadingGuide() {
  return (
    <aside className={styles.guide} id="comment-lire">
      <p className={styles.title}>Comment lire cette page ?</p>
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
