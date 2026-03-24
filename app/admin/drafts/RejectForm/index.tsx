'use client'

import { useState, useCallback } from 'react'
import Button from '../../../../components/ui/Button'
import styles from './RejectForm.module.css'

interface RejectFormProps {
  onReject: (note: string) => Promise<void>
  onRequestRevision: (note: string) => Promise<void>
  onCancel: () => void
  disabled: boolean
}

export default function RejectForm({
  onReject,
  onRequestRevision,
  onCancel,
  disabled,
}: RejectFormProps) {
  const [note, setNote] = useState('')

  const handleReject = useCallback(async () => {
    await onReject(note)
  }, [note, onReject])

  const handleRequestRevision = useCallback(async () => {
    await onRequestRevision(note)
  }, [note, onRequestRevision])

  return (
    <div className={styles.container}>
      <textarea
        className={styles.textarea}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Commentaire (obligatoire)…"
        rows={3}
      />
      <div className={styles.actions}>
        <Button
          variant="secondary"
          size="small"
          onClick={handleRequestRevision}
          disabled={!note.trim() || disabled}
        >
          Demander une révision
        </Button>
        <Button
          variant="danger"
          size="small"
          onClick={handleReject}
          disabled={!note.trim() || disabled}
        >
          Rejeter définitivement
        </Button>
        <Button variant="link" size="small" onClick={onCancel} disabled={disabled}>
          Annuler
        </Button>
      </div>
    </div>
  )
}
