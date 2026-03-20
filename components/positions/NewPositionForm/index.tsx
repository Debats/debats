'use client'

import { useState, useCallback, FormEvent } from 'react'
import * as Sentry from '@sentry/nextjs'
import { createPositionAction, ActionResult } from '../../../app/actions/create-position'
import { FieldErrors } from '../../../domain/use-cases/create-position'
import TextField from '../../ui/TextField'
import TextArea from '../../ui/TextArea'
import Button from '../../ui/Button'
import FormError from '../../ui/FormError'
import FormSuccess from '../../ui/FormSuccess'
import GuideExample from '../../ui/GuideExample'
import styles from '../../ui/form-with-guide.module.css'

interface NewPositionFormProps {
  subjectId: string
  subjectSlug: string
  subjectTitle: string
}

export default function NewPositionForm({
  subjectId,
  subjectSlug,
  subjectTitle,
}: NewPositionFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [isPending, setIsPending] = useState(false)
  const [successResult, setSuccessResult] = useState<{
    title: string
  }>()

  const resetForm = useCallback(() => {
    setTitle('')
    setDescription('')
    setError(undefined)
    setFieldErrors(undefined)
    setSuccessResult(undefined)
  }, [])

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
        const result: ActionResult = await createPositionAction(subjectId, formData)

        setIsPending(false)

        if (!result.success) {
          if (result.error) {
            setError(result.error)
          }
          if (result.fieldErrors) {
            setFieldErrors(result.fieldErrors)
          }
        } else {
          setSuccessResult({ title: result.title })
        }
      } catch (err) {
        Sentry.captureException(err)
        setError('Une erreur inattendue est survenue. Veuillez réessayer.')
        setIsPending(false)
      }
    },
    [title, description, subjectId],
  )

  if (successResult) {
    return (
      <FormSuccess
        title={`La position « ${successResult.title} » a été créée !`}
        primaryAction={{
          label: 'Ajouter une prise de position',
          href: `/nouvelle-prise-de-position?subjectId=${subjectId}&subjectTitle=${encodeURIComponent(subjectTitle)}`,
        }}
        secondaryActions={[
          {
            label: 'Ajouter une autre position',
            onClick: resetForm,
          },
          {
            label: 'Retour au sujet',
            href: `/s/${subjectSlug}`,
          },
        ]}
      />
    )
  }

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
        <div className={styles.guide}>
          <p className={styles.guideTitle}>Conseil</p>
          <p className={styles.guideText}>
            La position doit exprimer un point de vue précis et concret sur le sujet. Évitez les
            intitulés vagues ou fourre-tout qui pourraient rassembler des points de vue très
            différents. Une même personnalité pourra être associée à plusieurs positions.
          </p>
          <GuideExample good="Pour un moratoire sur les SUV en ville" bad="Les SUV c'est nul" />
          <GuideExample good="Modulation du crédit selon les revenus" bad="Réforme en profondeur" />
        </div>
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
        <div className={styles.guide}>
          <p className={styles.guideTitle}>Conseil</p>
          <p className={styles.guideText}>
            Décrivez factuellement ce que cette position implique. Restez neutre et objectif.
          </p>
        </div>
      </div>

      <div className={styles.actions}>
        <Button type="submit">{isPending ? 'Création en cours...' : 'Créer cette position'}</Button>
        <Button href={`/s/${subjectSlug}`} variant="link">
          Annuler
        </Button>
      </div>
    </form>
  )
}
