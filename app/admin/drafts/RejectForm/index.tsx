'use client'

import { useState, useCallback } from 'react'
import Button from '../../../../components/ui/Button'
import styles from './RejectForm.module.css'

interface RejectFormProps {
  onReject: (note: string) => Promise<void>
  onCancel: () => void
  disabled: boolean
}

export default function RejectForm({ onReject, onCancel, disabled }: RejectFormProps) {
  const [note, setNote] = useState('')

  const handleSubmit = useCallback(async () => {
    await onReject(note)
  }, [note, onReject])

  return (
    <div className={styles.container}>
      <textarea
        className={styles.textarea}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Raison du rejet (obligatoire)…"
        rows={3}
      />
      <div className={styles.actions}>
        <Button
          variant="danger"
          size="small"
          onClick={handleSubmit}
          disabled={!note.trim() || disabled}
        >
          Confirmer le rejet
        </Button>
        <Button variant="link" size="small" onClick={onCancel} disabled={disabled}>
          Annuler
        </Button>
      </div>
    </div>
  )
}
