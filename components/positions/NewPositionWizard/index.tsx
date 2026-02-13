'use client'

import { useState, useCallback, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  createPositionWithStatementAction,
  ActionResult,
} from '../../../app/actions/create-position-with-statement'
import { searchPublicFigures } from '../../../app/actions/search-public-figures'
import { FieldErrors } from '../../../domain/use-cases/create-position-with-statement'
import Combobox from '../../ui/Combobox'
import TextField from '../../ui/TextField'
import TextArea from '../../ui/TextArea'
import Button from '../../ui/Button'
import FormError from '../../ui/FormError'
import styles from './NewPositionWizard.module.css'

interface NewPositionWizardProps {
  subjectId: string
  slug: string
}

export default function NewPositionWizard({ subjectId, slug }: NewPositionWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [isPending, setIsPending] = useState(false)

  const handleNextStep = useCallback(() => {
    const stepErrors: FieldErrors = {}
    if (title.length < 3) {
      stepErrors.title = 'Le titre doit faire entre 3 et 255 caractères.'
    }
    if (description.length < 10) {
      stepErrors.description = 'La description doit faire au moins 10 caractères.'
    }
    if (Object.keys(stepErrors).length > 0) {
      setFieldErrors(stepErrors)
      return
    }
    setFieldErrors(undefined)
    setError(undefined)
    setCurrentStep(2)
  }, [title, description])

  const handlePreviousStep = useCallback(() => {
    setCurrentStep(1)
    setError(undefined)
    setFieldErrors(undefined)
  }, [])

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(undefined)
      setFieldErrors(undefined)
      setIsPending(true)

      const formData = new FormData(e.currentTarget)
      formData.set('title', title)
      formData.set('description', description)

      const result: ActionResult = await createPositionWithStatementAction(
        subjectId,
        slug,
        formData,
      )

      setIsPending(false)

      if (!result.success) {
        if (result.error) {
          setError(result.error)
        }
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors)
          if (result.fieldErrors.title || result.fieldErrors.description) {
            setCurrentStep(1)
          }
        }
      } else {
        router.push(`/s/${slug}`)
      }
    },
    [subjectId, slug, title, description, router],
  )

  const handleSearchFigures = useCallback(async (query: string) => {
    const results = await searchPublicFigures(query)
    return results.map((f) => ({ id: f.id, label: f.name }))
  }, [])

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <FormError message={error} />}

      <div className={styles.steps}>
        <span
          className={`${styles.step} ${currentStep === 1 ? styles.stepActive : styles.stepDone}`}
        >
          1. Position
        </span>
        <span className={`${styles.step} ${currentStep === 2 ? styles.stepActive : ''}`}>
          2. Prise de position
        </span>
      </div>

      {currentStep === 1 && (
        <div className={styles.stepContent}>
          <TextField
            label="Titre de la position"
            id="title"
            name="title"
            required
            placeholder="ex : Pour l'interdiction, Contre la mesure..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={fieldErrors?.title}
          />

          <TextArea
            label="Description"
            id="description"
            name="description"
            required
            placeholder="Décrivez cette position en quelques phrases (min. 10 caractères)"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={fieldErrors?.description}
          />

          <div className={styles.actions}>
            <Button type="button" onClick={handleNextStep}>
              Suivant
            </Button>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className={styles.stepContent}>
          <div className={styles.recap}>
            <span className={styles.recapLabel}>Position :</span> {title}
          </div>

          <Combobox
            label="Personnalité"
            id="publicFigureId"
            name="publicFigureId"
            required
            placeholder="Rechercher une personnalité..."
            onSearch={handleSearchFigures}
          />

          <TextField
            label="Nom de la source"
            id="sourceName"
            name="sourceName"
            required
            placeholder="ex : Le Monde, France Inter"
            error={fieldErrors?.sourceName}
          />

          <TextField
            label="URL de la source"
            id="sourceUrl"
            name="sourceUrl"
            placeholder="https://..."
          />

          <TextArea
            label="Citation"
            id="quote"
            name="quote"
            required
            placeholder="Citation exacte de la personnalité (min. 10 caractères)"
            rows={4}
            error={fieldErrors?.quote}
          />

          <div className={styles.dateField}>
            <label className={styles.dateLabel} htmlFor="factDate">
              Date du fait
            </label>
            <input
              className={styles.dateInput}
              id="factDate"
              name="factDate"
              type="date"
              required
            />
            {fieldErrors?.factDate && (
              <span className={styles.fieldError}>{fieldErrors.factDate}</span>
            )}
          </div>

          <div className={styles.actions}>
            <Button type="button" variant="link" onClick={handlePreviousStep}>
              Précédent
            </Button>
            <Button type="submit">
              {isPending ? 'Création en cours...' : 'Créer cette position'}
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}
