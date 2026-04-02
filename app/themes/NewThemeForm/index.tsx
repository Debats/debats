'use client'

import { useState, useCallback, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { createThemeAction } from '../../actions/create-theme'
import TextField from '../../../components/ui/TextField'
import Button from '../../../components/ui/Button'
import FormError from '../../../components/ui/FormError'
import styles from '../themes.module.css'

export default function NewThemeForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>()
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(undefined)
      setFieldErrors(undefined)
      setIsPending(true)

      const formData = new FormData()
      formData.set('name', name)
      formData.set('description', description)

      try {
        const result = await createThemeAction(formData)

        if (!result.success) {
          if ('error' in result) {
            setError(result.error)
          }
          if ('fieldErrors' in result) {
            setFieldErrors(result.fieldErrors)
          }
          setIsPending(false)
        } else {
          setName('')
          setDescription('')
          setIsPending(false)
          router.refresh()
        }
      } catch (err) {
        Sentry.captureException(err)
        setError('Une erreur inattendue est survenue.')
        setIsPending(false)
      }
    },
    [name, description, router],
  )

  return (
    <form onSubmit={handleSubmit} className={styles.newForm}>
      <p className={styles.newFormTitle}>Nouvelle thématique</p>

      {error && <FormError message={error} />}

      <div className={styles.newFormRow}>
        <TextField
          label="Nom"
          id="theme-name"
          name="name"
          required
          placeholder="ex : Économie"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors?.name}
        />
        <TextField
          label="Description"
          id="theme-description"
          name="description"
          required
          placeholder="Fiscalité, emploi, finances publiques..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={fieldErrors?.description}
        />
      </div>

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Création...' : 'Ajouter'}
        </Button>
      </div>
    </form>
  )
}
