'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { createOccupationFamilyAction } from '../../actions/create-occupation-family'
import { FieldErrors } from '../../../domain/use-cases/types'
import TextField from '../../../components/ui/TextField'
import Button from '../../../components/ui/Button'
import FormError from '../../../components/ui/FormError'
import styles from '../metiers.module.css'

/** Ajout d'une famille de métiers, en fin de liste, réservé aux Idéalistes. */
export default function NewOccupationFamilyForm() {
  const router = useRouter()
  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    setError(undefined)
    setFieldErrors(undefined)
    setIsPending(true)

    try {
      const result = await createOccupationFamilyAction(new FormData(form))
      setIsPending(false)
      if (result.success) {
        form.reset()
        router.refresh()
      } else if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors)
      } else {
        setError(result.error)
      }
    } catch (err) {
      Sentry.captureException(err)
      setError('Une erreur inattendue est survenue.')
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.newForm}>
      <p className={styles.newFormTitle}>Nouvelle famille de métiers</p>
      {error && <FormError message={error} />}
      <div className={styles.newFormRow}>
        <TextField
          label="Nom"
          id="family-name"
          name="name"
          required
          placeholder="ex : Monde économique"
          error={fieldErrors?.name}
        />
        <TextField
          label="Description"
          id="family-description"
          name="description"
          placeholder="Facultative"
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Ajout…' : 'Ajouter'}
        </Button>
      </div>
    </form>
  )
}
