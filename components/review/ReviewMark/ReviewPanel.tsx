import { ReviewedEntityType } from '../../../domain/aggregates/review-events'
import {
  agreed,
  confirmersLine,
  FLAG_REASON_LABELS,
  markLabel,
  ReviewDetail,
  ReviewMark,
  thisEntity,
  Viewer,
} from '../../../domain/read-models/review'
import { formatRelativeDate } from '../../../lib/format-date'
import Glyph from './Glyph'
import styles from './ReviewMark.module.css'

interface ReviewPanelProps {
  entityType: ReviewedEntityType
  mark: ReviewMark
  /** Null tant que le détail n'est pas lu */
  detail: ReviewDetail | null
  viewer: Viewer
  busy: boolean
  error: string
  onConfirm: () => void
  onWithdrawConfirmation: () => void
  onFlag: () => void
  onWithdrawFlag: () => void
  onSignIn: () => void
}

/**
 * Ce que la marque ouvre : qui a confirmé, quels signalements sont en cours
 * et ce qu'ils disent, puis ce que la personne qui regarde peut faire.
 */
export default function ReviewPanel({
  entityType,
  mark,
  detail,
  viewer,
  busy,
  error,
  onConfirm,
  onWithdrawConfirmation,
  onFlag,
  onWithdrawFlag,
  onSignIn,
}: ReviewPanelProps) {
  // The day the panel is opened on, read at the edge: dates are told from it
  const today = new Date()

  return (
    <div className={styles.panelBody}>
      <div>
        <p className={styles.panelTitle}>{markLabel(entityType, { ...mark, openFlags: 0 })}</p>
        {detail && detail.lastConfirmedAt && (
          <p className={styles.panelNote}>
            {confirmersLine(detail.confirmers, detail.confirmations)} · dernière vérification :{' '}
            {formatRelativeDate(detail.lastConfirmedAt, today).toLowerCase()}
          </p>
        )}
        {!detail && <p className={styles.panelNote}>Chargement…</p>}
      </div>

      {detail?.flags.map((flag) => (
        <div key={flag.id} className={styles.section}>
          <p className={styles.flagReason}>
            Signalement en cours · {FLAG_REASON_LABELS[flag.reason]}
          </p>
          <p className={styles.flagComment}>« {flag.comment} »</p>
          <p className={styles.flagMeta}>
            {flag.by ?? 'Un·e lecteur·rice'} · {formatRelativeDate(flag.at, today).toLowerCase()}
          </p>
        </div>
      ))}

      {viewer === 'visitor' && (
        <p className={`${styles.section} ${styles.panelNote}`}>
          Vous avez vérifié {thisEntity(entityType)} ?{' '}
          <button type="button" className={styles.inlineAction} onClick={onSignIn}>
            Connectez-vous
          </button>{' '}
          pour confirmer ou signaler.
        </p>
      )}

      {viewer !== 'visitor' && detail?.addedByViewer && (
        <p className={`${styles.section} ${styles.panelNote}`}>
          Vous avez ajouté {thisEntity(entityType)} : à d’autres de la vérifier.
        </p>
      )}

      {viewer !== 'visitor' && detail && !detail.addedByViewer && (
        <div className={`${styles.section} ${styles.actions}`}>
          <button
            type="button"
            className={styles.action}
            aria-pressed={mark.confirmedByViewer}
            disabled={busy}
            onClick={mark.confirmedByViewer ? onWithdrawConfirmation : onConfirm}
          >
            <Glyph shape="check" size={15} />
            {mark.confirmedByViewer ? agreed(entityType, 'Confirmé') : 'Confirmer'}
          </button>
          <button
            type="button"
            className={styles.quietAction}
            disabled={busy}
            onClick={mark.flaggedByViewer ? onWithdrawFlag : onFlag}
          >
            <Glyph shape="flag" size={15} />
            {mark.flaggedByViewer ? 'Retirer mon signalement' : 'Signaler…'}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  )
}
