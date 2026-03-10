'use client'

import { useState, useCallback, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  createPublicFigureWithStatementAction,
  ActionResult,
} from '../../../app/actions/create-public-figure-with-statement'
import { searchSubjects } from '../../../app/actions/search-subjects'
import {
  getPositionsForSubject,
  PositionOption,
} from '../../../app/actions/get-positions-for-subject'
import { FieldErrors } from '../../../domain/use-cases/create-public-figure-with-statement'
import Combobox from '../../ui/Combobox'
import TextField from '../../ui/TextField'
import TextArea from '../../ui/TextArea'
import Button from '../../ui/Button'
import FormError from '../../ui/FormError'
import styles from './NewPublicFigureWizard.module.css'

export default function NewPublicFigureWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)

  // Step 1 fields
  const [name, setName] = useState('')
  const [presentation, setPresentation] = useState('')
  const [wikipediaUrl, setWikipediaUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [notorietySource1, setNotorietySource1] = useState('')
  const [notorietySource2, setNotorietySource2] = useState('')

  // Step 2 fields
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [positions, setPositions] = useState<PositionOption[]>([])
  const [selectedPositionId, setSelectedPositionId] = useState('')
  const [loadingPositions, setLoadingPositions] = useState(false)

  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (!selectedSubjectId) {
      setPositions([])
      setSelectedPositionId('')
      return
    }

    setLoadingPositions(true)
    getPositionsForSubject(selectedSubjectId).then((result) => {
      setPositions(result)
      setSelectedPositionId('')
      setLoadingPositions(false)
    })
  }, [selectedSubjectId])

  const handleNextStep = useCallback(() => {
    const stepErrors: FieldErrors = {}
    if (name.length < 2) {
      stepErrors.name = 'Le nom doit faire entre 2 et 100 caractères.'
    }
    if (presentation.length < 10) {
      stepErrors.presentation = 'La présentation doit faire au moins 10 caractères.'
    }

    const trimmedWikipedia = wikipediaUrl.trim()
    if (trimmedWikipedia) {
      if (!/^https:\/\/(fr|en)\.wikipedia\.org\/wiki\/.+/.test(trimmedWikipedia)) {
        stepErrors.wikipediaUrl =
          'L\u2019URL Wikipedia est invalide (format attendu : https://fr.wikipedia.org/wiki/...).'
      }
    } else {
      const urlPattern = /^https?:\/\/.+/
      const s1 = notorietySource1.trim()
      const s2 = notorietySource2.trim()
      if (!s1 || !s2 || !urlPattern.test(s1) || !urlPattern.test(s2)) {
        stepErrors.notorietySources =
          'Sans page Wikipedia, deux sources de notoriété (URLs valides) sont requises.'
      }
    }

    if (Object.keys(stepErrors).length > 0) {
      setFieldErrors(stepErrors)
      return
    }
    setFieldErrors(undefined)
    setError(undefined)
    setCurrentStep(2)
  }, [name, presentation, wikipediaUrl, notorietySource1, notorietySource2])

  const handlePreviousStep = useCallback(() => {
    setCurrentStep(1)
    setError(undefined)
    setFieldErrors(undefined)
  }, [])

  const handleSearchSubjects = useCallback(async (query: string) => {
    const results = await searchSubjects(query)
    return results.map((s) => ({ id: s.id, label: s.title }))
  }, [])

  const handleSubjectSelected = useCallback((id: string) => {
    setSelectedSubjectId(id)
  }, [])

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(undefined)
      setFieldErrors(undefined)
      setIsPending(true)

      const formData = new FormData()
      formData.set('name', name)
      formData.set('presentation', presentation)
      formData.set('wikipediaUrl', wikipediaUrl)
      formData.set('websiteUrl', websiteUrl)

      const s1 = notorietySource1.trim()
      const s2 = notorietySource2.trim()
      if (s1) formData.append('notorietySources', s1)
      if (s2) formData.append('notorietySources', s2)

      formData.set('subjectId', selectedSubjectId)
      formData.set('positionId', selectedPositionId)
      formData.set(
        'sourceName',
        String(
          e.currentTarget.elements.namedItem('sourceName')
            ? (e.currentTarget.elements.namedItem('sourceName') as HTMLInputElement).value
            : '',
        ),
      )
      formData.set(
        'sourceUrl',
        String(
          e.currentTarget.elements.namedItem('sourceUrl')
            ? (e.currentTarget.elements.namedItem('sourceUrl') as HTMLInputElement).value
            : '',
        ),
      )
      formData.set(
        'quote',
        String(
          e.currentTarget.elements.namedItem('quote')
            ? (e.currentTarget.elements.namedItem('quote') as HTMLTextAreaElement).value
            : '',
        ),
      )
      formData.set(
        'factDate',
        String(
          e.currentTarget.elements.namedItem('factDate')
            ? (e.currentTarget.elements.namedItem('factDate') as HTMLInputElement).value
            : '',
        ),
      )

      const result: ActionResult = await createPublicFigureWithStatementAction(formData)

      setIsPending(false)

      if (!result.success) {
        if (result.error) {
          setError(result.error)
        }
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors)
          if (
            result.fieldErrors.name ||
            result.fieldErrors.presentation ||
            result.fieldErrors.wikipediaUrl ||
            result.fieldErrors.notorietySources
          ) {
            setCurrentStep(1)
          }
        }
      } else {
        router.push(`/p/${result.slug}`)
      }
    },
    [
      name,
      presentation,
      wikipediaUrl,
      websiteUrl,
      notorietySource1,
      notorietySource2,
      selectedSubjectId,
      selectedPositionId,
      router,
    ],
  )

  const showNotorietySources = !wikipediaUrl.trim()

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <FormError message={error} />}

      <div className={styles.steps}>
        <span
          className={`${styles.step} ${currentStep === 1 ? styles.stepActive : styles.stepDone}`}
        >
          1. Personnalité
        </span>
        <span className={`${styles.step} ${currentStep === 2 ? styles.stepActive : ''}`}>
          2. Première prise de position
        </span>
      </div>

      {currentStep === 1 && (
        <div className={styles.stepContent}>
          <div className={styles.fieldGroup}>
            <TextField
              label="Nom"
              id="name"
              name="name"
              required
              placeholder="ex : Albert Camus, Simone Veil..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={fieldErrors?.name}
            />
            <div className={styles.guide}>
              <p className={styles.guideTitle}>Conseil</p>
              <p className={styles.guideText}>
                Le nom complet tel qu&apos;il est communément connu. Pas de titre (Dr, M., Mme).
              </p>
              <p className={styles.guideExample}>
                <span className={styles.guideGood}>Simone Veil</span>{' '}
                <span className={styles.guideBad}>Mme Simone Veil</span>
              </p>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <TextArea
              label="Présentation"
              id="presentation"
              name="presentation"
              required
              placeholder="Courte présentation de la personnalité (min. 10 caractères)"
              rows={4}
              value={presentation}
              onChange={(e) => setPresentation(e.target.value)}
              error={fieldErrors?.presentation}
            />
            <div className={styles.guide}>
              <p className={styles.guideTitle}>Conseil</p>
              <p className={styles.guideText}>
                Décrivez brièvement qui est cette personne : fonction, rôle, domaine
                d&apos;activité. Restez factuel et neutre, sans jugement de valeur.
              </p>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <TextField
              label="URL Wikipedia (optionnel)"
              id="wikipediaUrl"
              name="wikipediaUrl"
              placeholder="https://fr.wikipedia.org/wiki/..."
              value={wikipediaUrl}
              onChange={(e) => setWikipediaUrl(e.target.value)}
              error={fieldErrors?.wikipediaUrl}
            />
            <div className={styles.guide}>
              <p className={styles.guideTitle}>Conseil</p>
              <p className={styles.guideText}>
                La page Wikipedia de la personnalité, si elle en a une. Seules les pages
                fr.wikipedia.org et en.wikipedia.org sont acceptées.
              </p>
            </div>
          </div>

          {showNotorietySources && (
            <div className={styles.notorietySection}>
              <p className={styles.notorietyTitle}>Sources de notoriété</p>
              <div className={styles.guide}>
                <p className={styles.guideTitle}>Pourquoi ?</p>
                <p className={styles.guideText}>
                  Sans page Wikipedia, la personnalité doit justifier de sa notoriété par au moins
                  deux publications dans des sources indépendantes et fiables (article de presse,
                  page institutionnelle, rapport officiel...).
                </p>
              </div>
              <TextField
                label="Source de notoriété 1"
                id="notorietySource1"
                name="notorietySources"
                required
                placeholder="https://lemonde.fr/..."
                value={notorietySource1}
                onChange={(e) => setNotorietySource1(e.target.value)}
              />
              <TextField
                label="Source de notoriété 2"
                id="notorietySource2"
                name="notorietySources"
                required
                placeholder="https://liberation.fr/..."
                value={notorietySource2}
                onChange={(e) => setNotorietySource2(e.target.value)}
              />
              {fieldErrors?.notorietySources && (
                <span className={styles.fieldError}>{fieldErrors.notorietySources}</span>
              )}
            </div>
          )}

          <div className={styles.fieldGroup}>
            <TextField
              label="Site web (optionnel)"
              id="websiteUrl"
              name="websiteUrl"
              placeholder="https://..."
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
            <div className={styles.guide}>
              <p className={styles.guideTitle}>Conseil</p>
              <p className={styles.guideText}>
                Le site officiel de la personnalité, s&apos;il existe.
              </p>
            </div>
          </div>

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
            <span className={styles.recapLabel}>Personnalité :</span> {name}
          </div>

          <Combobox
            label="Sujet"
            id="subjectId"
            name="subjectId"
            required
            placeholder="Rechercher un sujet..."
            onSearch={handleSearchSubjects}
            onSelect={handleSubjectSelected}
          />

          <div className={styles.selectField}>
            <label className={styles.selectLabel} htmlFor="positionId">
              Position
            </label>
            <select
              className={styles.selectInput}
              id="positionId"
              name="positionId"
              required
              value={selectedPositionId}
              onChange={(e) => setSelectedPositionId(e.target.value)}
              disabled={!selectedSubjectId || loadingPositions}
            >
              <option value="">
                {loadingPositions
                  ? 'Chargement...'
                  : selectedSubjectId
                    ? 'Choisir une position'
                    : 'Sélectionnez d\u2019abord un sujet'}
              </option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <TextField
            label="Nom de la source"
            id="sourceName"
            name="sourceName"
            required
            placeholder="ex : Le Monde, France Inter"
            error={fieldErrors?.sourceName}
          />

          <TextField
            label="URL de la source (optionnel)"
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
              {isPending ? 'Création en cours...' : 'Créer cette personnalité'}
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}
