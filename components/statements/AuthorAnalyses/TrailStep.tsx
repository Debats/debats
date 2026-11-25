import { PositionStep } from '../../../domain/services/author-analyses'
import { formatMonthYear } from '../../../lib/format-date'
import styles from './AuthorAnalyses.module.css'

interface TrailStepProps {
  step: PositionStep
  /** Quittée en même temps que la position qui la précède : jointe par « et », pas par une flèche */
  beside?: boolean
}

/** Une position d'une piste de changements, et le mois où elle a été prise. */
export default function TrailStep({ step, beside = false }: TrailStepProps) {
  return (
    <li className={beside ? styles.stepBeside : styles.step}>
      <span className={styles.stepPosition}>{step.position.title}</span>
      <span className={styles.meta}>{formatMonthYear(step.statedAt)}</span>
    </li>
  )
}
