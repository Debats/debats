'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { deleteSubjectAction } from '../../../app/actions/delete-subject'
import Button from '../../ui/Button'
import styles from './SubjectActions.module.css'

interface SubjectActionsProps {
  subjectId: string
  subjectSlug: string
  canEdit: boolean
  canDelete: boolean
}

export default function SubjectActions({
  subjectId,
  subjectSlug,
  canEdit,
  canDelete,
}: SubjectActionsProps) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string>()

  const handleDelete = useCallback(async () => {
    setError(undefined)
    setIsPending(true)

    try {
      const result = await deleteSubjectAction(subjectId)

      if (!result.success) {
        setError(result.error)
        setIsPending(false)
      } else {
        router.push('/s')
      }
    } catch (err) {
      Sentry.captureException(err, { extra: { subjectId } })
      setError('Une erreur inattendue est survenue. Veuillez réessayer.')
      setIsPending(false)
    }
  }, [subjectId, router])

  if (!canEdit && !canDelete) return null

  return (
    <div className={styles.container}>
      <div className={styles.actions}>
        {canEdit && (
          <Button href={`/s/${subjectSlug}/modifier`} variant="secondary">
            Modifier
          </Button>
        )}
        {canDelete && (
          <Button variant="secondary" onClick={() => setShowConfirm(true)}>
            Supprimer
          </Button>
        )}
      </div>

      {showConfirm && (
        <div className={styles.deleteConfirm}>
          <p className={styles.deleteWarning}>
            Cette action est irréversible. Toutes les prises de position, les preuves et les
            arguments liés à ce sujet seront également supprimés.
          </p>
          <div className={styles.deleteActions}>
            <Button variant="danger" size="small" onClick={handleDelete} disabled={isPending}>
              {isPending ? 'Suppression...' : 'Confirmer la suppression'}
            </Button>
            <Button
              variant="link"
              size="small"
              onClick={() => {
                setShowConfirm(false)
                setError(undefined)
              }}
              disabled={isPending}
            >
              Annuler
            </Button>
          </div>
          {error && <p className={styles.deleteError}>{error}</p>}
        </div>
      )}
    </div>
  )
}
