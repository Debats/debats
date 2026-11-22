import { plural } from '../../../../../lib/plural'
import Select from '../../../../../components/ui/Select'
import styles from './MergeSubjectsForm.module.css'

/** The choice that carries the position over as it is, rather than folding it into another */
export const CARRIED_OVER = ''

interface PositionFateFieldProps {
  position: { id: string; title: string; voices: number }
  keptSubjectTitle: string
  keptPositions: Array<{ id: string; title: string }>
  /** The position of the subject that remains it is folded into, or `CARRIED_OVER` */
  value: string
  onChange: (value: string) => void
}

/** What becomes of one position of the subject that disappears */
export default function PositionFateField({
  position,
  keptSubjectTitle,
  keptPositions,
  value,
  onChange,
}: PositionFateFieldProps) {
  return (
    <div className={styles.position}>
      <Select
        id={`fate-${position.id}`}
        label={`« ${position.title} »`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        options={[
          { value: CARRIED_OVER, label: `La reporter telle quelle sur « ${keptSubjectTitle} »` },
          ...keptPositions.map((kept) => ({
            value: kept.id,
            label: `La fondre dans « ${kept.title} »`,
          })),
        ]}
      />
      <span className={styles.voices}>
        {position.voices > 0
          ? `${position.voices} voix ${plural(position.voices, 'la défend', 'la défendent')}`
          : 'Personne ne la défend encore'}
      </span>
    </div>
  )
}
