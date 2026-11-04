'use client'

import { useState, useCallback, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { renameArgumentAction } from '../../../actions/rename-argument'
import { FieldErrors } from '../../../../domain/use-cases/types'
import Button from '../../../../components/ui/Button'
import TextArea from '../../../../components/ui/TextArea'
import TextField from '../../../../components/ui/TextField'
import styles from './ArgumentAdminMenu.module.css'

interface RenameFormProps {
  argument: { id: string; title: string; description: string }
  /** The revision of the argument's stream the page shows: a rename made meanwhile is not overwritten */
  revision: number
  onCancel: () => void
}

/** Le panneau « Renommer » du menu d'un argument. */
export default function RenameForm({ argument, revision, onCancel }: RenameFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(argument.title)
  const [description, setDescription] = useState(argument.description)
  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(undefined)
      setFieldErrors(undefined)
      setIsPending(true)
      const result = await renameArgumentAction(argument.id, { title, description, revision })
      setIsPending(false)
      if (result.success) {
        router.push(`/arguments/${result.slug}`)
        router.refresh()
      } else if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors)
      } else {
        setError(result.error)
      }
    },
    [argument.id, title, description, revision, router],
  )

  return (
    <form onSubmit={handleSubmit} className={styles.panel}>
      <TextField
        label="Titre"
        id="argument-title"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={fieldErrors?.title}
      />
      <TextArea
        label="Description"
        id="argument-description"
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Facultative : ce que recouvre cet argument, pour le distinguer d’un argument proche"
        error={fieldErrors?.description}
      />
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <Button type="submit" size="small" disabled={isPending}>
          {isPending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
        <Button type="button" variant="link" size="small" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
