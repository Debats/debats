import {
  FamilyDistribution,
  familyPositionMatrix,
} from '../../../../domain/services/occupation-distribution'
import { plural } from '../../../../lib/plural'
import Deviations from './Deviations'
import LeaningBars from './LeaningBars'
import Matrix from './Matrix'
import styles from './SubjectAnalyses.module.css'

interface SubjectAnalysesProps {
  distribution: FamilyDistribution
}

const unassignedLabel = (count: number) =>
  `${count} ${plural(count, 'personnalité', 'personnalités')} sans métier renseigné`

/** Onglet Analyses d'un sujet : qui s'exprime, par famille de métiers, et vers quelle position. */
export default function SubjectAnalyses({ distribution }: SubjectAnalysesProps) {
  const { overall, unassignedCount } = distribution

  if (overall.length === 0) {
    return (
      <p className={styles.empty}>
        {unassignedCount === 0
          ? 'Les analyses apparaîtront avec les premières prises de position de personnalités.'
          : `Les analyses apparaîtront quand les personnalités de ce sujet auront un métier renseigné (${unassignedLabel(unassignedCount)}).`}
      </p>
    )
  }

  const matrix = familyPositionMatrix(distribution)

  return (
    <div className={styles.analyses}>
      <LeaningBars matrix={matrix} />
      <Matrix matrix={matrix} />
      <Deviations matrix={matrix} />
      <p className={styles.note}>
        Une personnalité compte une fois par famille et par position.
        {unassignedCount > 0 && ` ${unassignedLabel(unassignedCount)}.`}
      </p>
    </div>
  )
}
