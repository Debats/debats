'use client'

import { useState, useCallback } from 'react'
import { useRedirectingAction } from '../../../../../../hooks/useRedirectingAction'
import { mergePositionsAction } from '../../../../../actions/merge-positions-action'
import Button from '../../../../../../components/ui/Button'
import styles from './MergePositionForm.module.css'

interface PositionOption {
  id: string
  title: string
}

interface MergePositionFormProps {
  sourcePositionId: string
  subjectSlug: string
  otherPositions: PositionOption[]
}

export default function MergePositionForm({
  sourcePositionId,
  subjectSlug,
  otherPositions,
}: MergePositionFormProps) {
  const [targetId, setTargetId] = useState('')
  const { run, isPending, error } = useRedirectingAction()

  const handleMerge = useCallback(() => {
    if (!targetId) return
    // On success the action redirects to the position that remains
    return run(() => mergePositionsAction(sourcePositionId, targetId, subjectSlug), {
      sourcePositionId,
      targetId,
    })
  }, [run, sourcePositionId, subjectSlug, targetId])

  if (otherPositions.length === 0) return null

  return (
    <div className={styles.container}>
      <label className={styles.label} htmlFor="merge-target">
        Fusionner vers
      </label>
      <select
        id="merge-target"
        className={styles.select}
        value={targetId}
        onChange={(e) => setTargetId(e.target.value)}
      >
        <option value="">— Choisir —</option>
        {otherPositions.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
      <Button variant="danger" size="small" onClick={handleMerge} disabled={!targetId || isPending}>
        {isPending ? 'Fusion…' : 'Fusionner'}
      </Button>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
