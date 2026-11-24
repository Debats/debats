import { BoardRow, heldTogetherLabel } from '../../../../../domain/read-models/position-judgements'
import Segmented from '../../../../../components/ui/Segmented'
import styles from './PositionVerdicts.module.css'

const CONTRADICTORY = 'Se contredisent'
const COMPATIBLE = 'Compatibles'

interface VerdictRowProps {
  row: BoardRow
  compatible: boolean
  onJudge: (positionId: string, compatible: boolean) => void
}

/** Another position of the subject, and whether it goes with the selected one */
export default function VerdictRow({ row, compatible, onJudge }: VerdictRowProps) {
  const heldBy = heldTogetherLabel(row.heldBy)

  return (
    <li className={styles.row}>
      <div className={styles.position}>
        <span className={styles.name}>{row.position.title}</span>
        {heldBy && <span className={styles.heldBy}>{heldBy}</span>}
      </div>
      <Segmented
        ariaLabel={row.position.title}
        items={[{ label: CONTRADICTORY }, { label: COMPATIBLE }]}
        active={compatible ? COMPATIBLE : CONTRADICTORY}
        onChange={(label) => {
          const chosen = label === COMPATIBLE
          if (chosen !== compatible) onJudge(row.position.id, chosen)
        }}
      />
    </li>
  )
}
