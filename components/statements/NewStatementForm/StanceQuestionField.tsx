import { StanceQuestion, stanceSentence } from '../../../domain/read-models/stance-question'
import styles from './NewStatementForm.module.css'

interface StanceQuestionFieldProps {
  authorName: string
  question: StanceQuestion
  /** Undefined until answered: no answer is ticked beforehand */
  compatible: boolean | undefined
  onAnswer: (positionId: string, compatible: boolean) => void
}

/** One position the author already took, and whether it goes with the one being recorded */
export default function StanceQuestionField({
  authorName,
  question,
  compatible,
  onAnswer,
}: StanceQuestionFieldProps) {
  const { lead, title, tail } = stanceSentence(authorName, question)
  const name = `stance-${question.position.id}`

  return (
    <fieldset className={styles.stance}>
      <legend className={styles.stanceLegend}>
        {lead}
        <strong>{title}</strong>
        {tail}
      </legend>
      <label className={styles.stanceAnswer}>
        <input
          type="radio"
          name={name}
          required
          checked={compatible === false}
          onChange={() => onAnswer(question.position.id, false)}
          className={styles.radio}
        />
        Les deux positions se contredisent
      </label>
      <label className={styles.stanceAnswer}>
        <input
          type="radio"
          name={name}
          required
          checked={compatible === true}
          onChange={() => onAnswer(question.position.id, true)}
          className={styles.radio}
        />
        Les deux positions sont compatibles
      </label>
    </fieldset>
  )
}
