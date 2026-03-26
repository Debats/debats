'use client'

import { useState, useCallback } from 'react'
import Button from '../Button'
import styles from './ConfirmAction.module.css'

interface ConfirmActionProps {
  /** Text shown on the initial trigger link (ignored if open=true) */
  triggerLabel?: string
  /** Warning message shown in confirmation mode */
  warning: string
  /** Confirm button label */
  confirmLabel?: string
  /** Pending button label */
  pendingLabel?: string
  /** Start directly in confirmation mode (no trigger) */
  open?: boolean
  /** Called when the user clicks cancel (useful when open=true) */
  onCancel?: () => void
  onConfirm: () => Promise<void>
}

export default function ConfirmAction({
  triggerLabel = 'Êtes-vous sûr·e ?',
  warning,
  confirmLabel = 'Confirmer',
  pendingLabel = 'En cours…',
  open = false,
  onCancel,
  onConfirm,
}: ConfirmActionProps) {
  const [showConfirm, setShowConfirm] = useState(open)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string>()

  const handleConfirm = useCallback(async () => {
    setError(undefined)
    setIsPending(true)

    try {
      await onConfirm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur inattendue est survenue.')
      setIsPending(false)
    }
  }, [onConfirm])

  const handleCancel = useCallback(() => {
    setShowConfirm(false)
    setError(undefined)
    onCancel?.()
  }, [onCancel])

  if (!showConfirm) {
    return (
      <button type="button" className={styles.trigger} onClick={() => setShowConfirm(true)}>
        {triggerLabel}
      </button>
    )
  }

  return (
    <div className={styles.confirm}>
      <p className={styles.warning}>{warning}</p>
      <div className={styles.actions}>
        <Button variant="danger" size="small" onClick={handleConfirm} disabled={isPending}>
          {isPending ? pendingLabel : confirmLabel}
        </Button>
        <Button variant="link" size="small" onClick={handleCancel} disabled={isPending}>
          Annuler
        </Button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
