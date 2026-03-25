'use client'

import { useState, useCallback } from 'react'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import * as Sentry from '@sentry/nextjs'
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
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string>()

  const handleMerge = useCallback(async () => {
    if (!targetId) return
    setError(undefined)
    setIsPending(true)

    try {
      const result = await mergePositionsAction(sourcePositionId, targetId, subjectSlug)
      // redirect() throws NEXT_REDIRECT, so we only reach here on business error
      if (result && !result.success) {
        setError(result.error)
        setIsPending(false)
      }
    } catch (err: unknown) {
      if (isRedirectError(err)) throw err
      Sentry.captureException(err, { extra: { sourcePositionId, targetId } })
      setError('Une erreur inattendue est survenue.')
      setIsPending(false)
    }
  }, [sourcePositionId, subjectSlug, targetId])

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
