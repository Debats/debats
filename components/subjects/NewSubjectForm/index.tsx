'use client'

import { useState, useCallback, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createSubjectAction, ActionResult } from '../../../app/actions/create-subject'
import TextField from '../../ui/TextField'
import TextArea from '../../ui/TextArea'
import Button from '../../ui/Button'
import FormError from '../../ui/FormError'
import styles from './NewSubjectForm.module.css'

export default function NewSubjectForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [presentation, setPresentation] = useState('')
  const [problem, setProblem] = useState('')
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(undefined)
      setIsPending(true)

      const formData = new FormData()
      formData.set('title', title)
      formData.set('presentation', presentation)
      formData.set('problem', problem)

      const result: ActionResult = await createSubjectAction(formData)

      setIsPending(false)

      if (!result.success) {
        setError(result.error)
      } else {
        router.push(`/s/${result.slug}`)
      }
    },
    [title, presentation, problem, router],
  )

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <FormError message={error} />}

      <TextField
        label="Titre du sujet"
        id="title"
        name="title"
        required
        placeholder="ex : L'énergie nucléaire, Le revenu universel..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <TextArea
        label="Présentation"
        id="presentation"
        name="presentation"
        required
        placeholder="Présentation du sujet de débat (min. 10 caractères)"
        rows={4}
        value={presentation}
        onChange={(e) => setPresentation(e.target.value)}
      />

      <TextArea
        label="Problématique"
        id="problem"
        name="problem"
        required
        placeholder="La question centrale du débat (min. 10 caractères)"
        rows={4}
        value={problem}
        onChange={(e) => setProblem(e.target.value)}
      />

      <div className={styles.actions}>
        <Button type="submit">{isPending ? 'Création en cours...' : 'Créer ce sujet'}</Button>
      </div>
    </form>
  )
}
