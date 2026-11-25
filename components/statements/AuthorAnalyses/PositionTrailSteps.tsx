import { PositionTrail } from '../../../domain/services/author-analyses'
import TrailStep from './TrailStep'
import styles from './AuthorAnalyses.module.css'

/**
 * Une suite de changements qui s'enchaînent : les positions quittées
 * ensemble, jointes par « et », puis chaque position prise, après une flèche.
 */
export default function PositionTrailSteps({ trail }: { trail: PositionTrail }) {
  return (
    <ol className={styles.steps}>
      {trail.left.map((step, index) => (
        <TrailStep key={`left-${step.position.id}`} step={step} beside={index > 0} />
      ))}
      {trail.taken.map((step, index) => (
        <TrailStep key={`taken-${step.position.id}-${index}`} step={step} />
      ))}
    </ol>
  )
}
