import { ReviewedEntityType } from '../../../domain/aggregates/review-events'
import { agreed, ReviewMark } from '../../../domain/read-models/review'
import Glyph from './Glyph'
import styles from './ReviewMark.module.css'

interface QuickActionsProps {
  entityType: ReviewedEntityType
  mark: ReviewMark
  busy: boolean
  onConfirm: () => void
  onWithdrawConfirmation: () => void
  onFlag: () => void
}

/**
 * Les deux gestes d'un·e lecteur·rice connecté·e, à portée d'un clic : ils
 * n'apparaissent qu'au survol ou au focus de la carte, pour ne rien demander
 * à qui lit. Sans survol (écran tactile), ils sont dans le panneau de détail.
 */
export default function QuickActions({
  entityType,
  mark,
  busy,
  onConfirm,
  onWithdrawConfirmation,
  onFlag,
}: QuickActionsProps) {
  return (
    <span className={styles.quick}>
      <button
        type="button"
        className={styles.quickAction}
        aria-pressed={mark.confirmedByViewer}
        disabled={busy}
        onClick={mark.confirmedByViewer ? onWithdrawConfirmation : onConfirm}
      >
        <Glyph shape="check" />
        {mark.confirmedByViewer ? agreed(entityType, 'Confirmé') : 'Confirmer'}
      </button>
      {!mark.flaggedByViewer && (
        <button type="button" className={styles.quickAction} disabled={busy} onClick={onFlag}>
          <Glyph shape="flag" size={12} />
          Signaler
        </button>
      )}
    </span>
  )
}
