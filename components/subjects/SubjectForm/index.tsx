'use client'

import { useState, useCallback, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import TextField from '../../ui/TextField'
import TextArea from '../../ui/TextArea'
import Button from '../../ui/Button'
import FormError from '../../ui/FormError'
import styles from './SubjectForm.module.css'

type SubmitResult = { success: true; slug: string } | { success: false; error: string }

interface SubjectFormProps {
  onSubmit: (formData: FormData) => Promise<SubmitResult>
  submitLabel: string
  pendingLabel: string
  cancelHref?: string
  initialTitle?: string
  initialPresentation?: string
  initialProblem?: string
}

export default function SubjectForm({
  onSubmit,
  submitLabel,
  pendingLabel,
  cancelHref,
  initialTitle = '',
  initialPresentation = '',
  initialProblem = '',
}: SubjectFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [presentation, setPresentation] = useState(initialPresentation)
  const [problem, setProblem] = useState(initialProblem)
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

      try {
        const result = await onSubmit(formData)

        if (!result.success) {
          setError(result.error)
          setIsPending(false)
        } else {
          router.push(`/s/${result.slug}`)
        }
      } catch (err) {
        Sentry.captureException(err)
        setError('Une erreur inattendue est survenue. Veuillez réessayer.')
        setIsPending(false)
      }
    },
    [title, presentation, problem, onSubmit, router],
  )

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <FormError message={error} />}

      <div className={styles.fieldGroup}>
        <TextField
          label="Titre du sujet"
          id="title"
          name="title"
          required
          placeholder="ex : L'énergie nucléaire, Le revenu universel..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className={styles.guide}>
          <p className={styles.guideTitle}>Guide de nommage</p>
          <p className={styles.guideText}>
            Le titre doit être neutre et ne pas inclure de position. Un sujet = un thème précis.
          </p>
          <p className={styles.guideExample}>
            <span className={styles.guideGood}>Le montant du SMIC</span>{' '}
            <span className={styles.guideBad}>L&apos;augmentation du SMIC</span>
          </p>
          <p className={styles.guideExample}>
            <span className={styles.guideGood}>La laïcité</span>{' '}
            <span className={styles.guideBad}>La laïcité en France</span>
          </p>
        </div>
      </div>

      <div className={styles.fieldGroup}>
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
        <div className={styles.guide}>
          <p className={styles.guideTitle}>Conseils</p>
          <p className={styles.guideText}>
            Présentez le sujet de façon factuelle et impartiale. Contextualisez le débat sans
            prendre parti. Pensez aux lecteurs qui découvrent le sujet.
          </p>
        </div>
      </div>

      <div className={styles.fieldGroup}>
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
        <div className={styles.guide}>
          <p className={styles.guideTitle}>Conseils</p>
          <p className={styles.guideText}>
            Formulez la question qui cristallise le débat. Elle doit être ouverte (pas de oui/non)
            et permettre plusieurs positions argumentées.
          </p>
          <p className={styles.guideExample}>
            <span className={styles.guideGood}>
              Quel rôle le nucléaire doit-il jouer dans la transition énergétique ?
            </span>
          </p>
        </div>
      </div>

      <div className={styles.actions}>
        <Button type="submit">{isPending ? pendingLabel : submitLabel}</Button>
        {cancelHref && (
          <Button href={cancelHref} variant="link">
            Annuler
          </Button>
        )}
      </div>
    </form>
  )
}
