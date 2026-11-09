import { ProofreadingStatus as Status } from './useProofreading'
import styles from './NewStatementForm.module.css'

interface ProofreadingStatusProps {
  status: Status
}

/**
 * The one line that says where the reading stands. Always rendered, even
 * empty: a live region that appears with its message may never be announced.
 *
 * A reading that found something says nothing here: its advice sits under
 * the fields, and counting it would only repeat it. A reading that fell is a
 * grey line, not an alert: nothing was lost, and the contribution goes anyway.
 */
export default function ProofreadingStatus({ status }: ProofreadingStatusProps) {
  return (
    <p className={styles.proofreadingStatus} role="status" aria-live="polite">
      {status.kind === 'reading' && (
        <>
          <span aria-hidden="true" className={styles.proofreadingSpinner} />
          Relecture en cours… Vous pouvez continuer à écrire.
        </>
      )}
      {status.kind === 'read' && status.remarks === 0 && 'Relecture terminée : rien à signaler.'}
      {status.kind === 'unavailable' && status.message}
    </p>
  )
}
