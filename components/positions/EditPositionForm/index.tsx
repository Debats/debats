'use client'

import { useState, useCallback, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { updatePositionAction, ActionResult } from '../../../app/actions/update-position'
import { ReviewDetail } from '../../../domain/read-models/review'
import { FieldErrors } from '../../../domain/use-cases/update-position'
import { useReviewOnEdit } from '../../review/ReviewOnEdit/use-review-on-edit'
import TextField from '../../ui/TextField'
import TextArea from '../../ui/TextArea'
import Button from '../../ui/Button'
import FormError from '../../ui/FormError'
import styles from '../../ui/form-with-guide.module.css'

interface EditPositionFormProps {
  positionId: string
  returnHref: string
  initialTitle: string
  initialDescription: string
  /** The revision of the subject's stream the form shows: an edit made meanwhile is not overwritten */
  revision: number
  /** What readers said of the position, when they confirmed or flagged it: the editor says what her edit makes of it */
  review: ReviewDetail | null
}

export default function EditPositionForm({
  positionId,
  returnHref,
  initialTitle,
  initialDescription,
  revision,
  review,
}: EditPositionFormProps) {
  const router = useRouter()
  const reviewed = useReviewOnEdit(review)
  const { correction } = reviewed
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(undefined)
      setFieldErrors(undefined)
      setIsPending(true)

      try {
        const result: ActionResult = await updatePositionAction(positionId, {
          title,
          description,
          revision,
          review: correction,
        })

        setIsPending(false)

        if (!result.success) {
          if (result.error) setError(result.error)
          if (result.fieldErrors) setFieldErrors(result.fieldErrors)
        } else {
          router.push(returnHref)
        }
      } catch (err) {
        Sentry.captureException(err)
        setError('Une erreur inattendue est survenue. Veuillez réessayer.')
        setIsPending(false)
      }
    },
    [positionId, title, description, revision, correction, returnHref, router],
  )

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <FormError message={error} />}

      <div className={styles.fieldGroup}>
        <TextField
          label="Titre de la position"
          id="title"
          required
          placeholder="ex : Pour l'interdiction, Contre toute régulation..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={fieldErrors?.title}
        />
      </div>

      <div className={styles.fieldGroup}>
        <TextArea
          label="Description"
          id="description"
          required
          placeholder="Développez cette position (min. 10 caractères)"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={fieldErrors?.description}
        />
      </div>

      {reviewed.block}

      <div className={styles.actions}>
        <Button type="submit">
          {isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </Button>
        <Button href={returnHref} variant="link">
          Annuler
        </Button>
      </div>
    </form>
  )
}
