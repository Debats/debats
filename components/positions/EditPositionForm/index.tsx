'use client'

import { useState, useCallback, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { updatePositionAction, ActionResult } from '../../../app/actions/update-position'
import { FieldErrors } from '../../../domain/use-cases/update-position'
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
}

export default function EditPositionForm({
  positionId,
  returnHref,
  initialTitle,
  initialDescription,
}: EditPositionFormProps) {
  const router = useRouter()
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

      const formData = new FormData()
      formData.set('title', title)
      formData.set('description', description)

      try {
        const result: ActionResult = await updatePositionAction(positionId, formData)

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
    [positionId, title, description, returnHref, router],
  )

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <FormError message={error} />}

      <div className={styles.fieldGroup}>
        <TextField
          label="Titre de la position"
          id="title"
          name="title"
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
          name="description"
          required
          placeholder="Développez cette position (min. 10 caractères)"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={fieldErrors?.description}
        />
      </div>

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
