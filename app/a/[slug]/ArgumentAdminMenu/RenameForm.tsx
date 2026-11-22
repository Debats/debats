'use client'

import { useState, useCallback, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { renameArgumentAction } from '../../../actions/rename-argument'
import { argumentHref } from '../../../../domain/read-models/hrefs'
import { ReviewDetail } from '../../../../domain/read-models/review'
import { FieldErrors } from '../../../../domain/use-cases/types'
import { useReviewOnEdit } from '../../../../components/review/ReviewOnEdit/use-review-on-edit'
import Button from '../../../../components/ui/Button'
import TextArea from '../../../../components/ui/TextArea'
import TextField from '../../../../components/ui/TextField'
import styles from './ArgumentAdminMenu.module.css'

interface RenameFormProps {
  argument: { id: string; title: string; description: string }
  /** The revision of the argument's stream the page shows: a rename made meanwhile is not overwritten */
  revision: number
  /** What readers said of the argument, when they confirmed or flagged it: the editor says what her rename makes of it */
  review: ReviewDetail | null
  onCancel: () => void
}

/** Le panneau « Renommer » du menu d'un argument. */
export default function RenameForm({ argument, revision, review, onCancel }: RenameFormProps) {
  const router = useRouter()
  const reviewed = useReviewOnEdit(review)
  const { correction } = reviewed
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
      const result = await renameArgumentAction(argument.id, {
        title,
        description,
        revision,
        review: correction,
      })
      setIsPending(false)
      if (result.success) {
        router.push(argumentHref(result))
        router.refresh()
      } else if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors)
      } else {
        setError(result.error)
      }
    },
    [argument.id, title, description, revision, correction, router],
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
      {reviewed.block}
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
