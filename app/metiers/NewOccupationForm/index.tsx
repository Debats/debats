'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { createOccupationAction } from '../../actions/create-occupation'
import { FieldErrors } from '../../../domain/use-cases/types'
import TextField from '../../../components/ui/TextField'
import Button from '../../../components/ui/Button'
import FormError from '../../../components/ui/FormError'
import styles from '../metiers.module.css'

/** Ajout d'un métier à la liste, réservé aux Idéalistes. */
export default function NewOccupationForm() {
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
      const result = await createOccupationAction(new FormData(form))
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
      <p className={styles.newFormTitle}>Nouveau métier</p>
      {error && <FormError message={error} />}
      <div className={styles.newFormRow}>
        <TextField
          label="Nom"
          id="occupation-name"
          name="name"
          required
          placeholder="ex : Député·e, Économiste"
          error={fieldErrors?.name}
        />
        <TextField
          label="Description"
          id="occupation-description"
          name="description"
          placeholder="Facultative : ce que recouvre ce métier"
          error={fieldErrors?.description}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Ajout…' : 'Ajouter'}
        </Button>
      </div>
    </form>
  )
}
