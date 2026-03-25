'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const [targetId, setTargetId] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string>()

  const handleMerge = useCallback(async () => {
    if (!targetId) return
    setError(undefined)
    setIsPending(true)

    try {
      const result = await mergePositionsAction(sourcePositionId, targetId)
      if (!result.success) {
        setError(result.error)
        setIsPending(false)
      } else {
        router.push(`/s/${subjectSlug}`)
        router.refresh()
      }
    } catch (err) {
      Sentry.captureException(err, { extra: { sourcePositionId, targetId } })
      setError('Une erreur inattendue est survenue.')
      setIsPending(false)
    }
  }, [sourcePositionId, subjectSlug, targetId, router])

  if (otherPositions.length === 0) return null

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Fusionner cette position</h3>
      <p className={styles.description}>
        Les prises de position seront déplacées vers la position cible, puis cette position sera
        supprimée.
      </p>
      <div className={styles.form}>
        <select
          className={styles.select}
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        >
          <option value="">— Fusionner vers… —</option>
          {otherPositions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <Button
          variant="danger"
          size="small"
          onClick={handleMerge}
          disabled={!targetId || isPending}
        >
          {isPending ? 'Fusion…' : 'Fusionner'}
        </Button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
