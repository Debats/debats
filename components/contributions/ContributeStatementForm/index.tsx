'use client'

import { useState, useCallback, useEffect, useRef, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { contributeStatementAction, ActionResult } from '../../../app/actions/contribute-statement'
import { searchSubjects } from '../../../app/actions/search-subjects'
import { searchPublicFigures } from '../../../app/actions/search-public-figures'
import {
  getPositionsForSubject,
  PositionOption,
} from '../../../app/actions/get-positions-for-subject'
import { FieldErrors } from '../../../domain/use-cases/contribute-statement'
import Combobox from '../../ui/Combobox'
import TextField from '../../ui/TextField'
import TextArea from '../../ui/TextArea'
import Button from '../../ui/Button'
import FormError from '../../ui/FormError'
import styles from './ContributeStatementForm.module.css'

const MAX_PHOTO_SIZE = 30 * 1024 * 1024 // 30 Mo

interface ContributeStatementFormProps {
  canAddPersonality: boolean
  canAddSubject: boolean
  canAddPosition: boolean
}

export default function ContributeStatementForm({
  canAddPersonality,
  canAddSubject,
  canAddPosition,
}: ContributeStatementFormProps) {
  const router = useRouter()

  // Toggle inline creation
  const [creatingNewFigure, setCreatingNewFigure] = useState(false)
  const [creatingNewSubject, setCreatingNewSubject] = useState(false)
  const [creatingNewPosition, setCreatingNewPosition] = useState(false)

  // Existing entity selections
  const [selectedFigureId, setSelectedFigureId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [selectedPositionId, setSelectedPositionId] = useState('')

  // New figure fields
  const [newFigureName, setNewFigureName] = useState('')
  const [newFigurePresentation, setNewFigurePresentation] = useState('')
  const [newFigureWikipediaUrl, setNewFigureWikipediaUrl] = useState('')
  const [newFigureWebsiteUrl, setNewFigureWebsiteUrl] = useState('')

  // New subject fields
  const [newSubjectTitle, setNewSubjectTitle] = useState('')
  const [newSubjectPresentation, setNewSubjectPresentation] = useState('')
  const [newSubjectProblem, setNewSubjectProblem] = useState('')

  // New position fields
  const [newPositionTitle, setNewPositionTitle] = useState('')
  const [newPositionDescription, setNewPositionDescription] = useState('')

  // Photo ref
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Positions for selected subject
  const [positions, setPositions] = useState<PositionOption[]>([])
  const [loadingPositions, setLoadingPositions] = useState(false)

  // Form state
  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [isPending, setIsPending] = useState(false)

  // When new subject is toggled on, auto-toggle new position too
  useEffect(() => {
    if (creatingNewSubject) {
      setCreatingNewPosition(true)
    }
  }, [creatingNewSubject])

  // Load positions when subject changes
  useEffect(() => {
    if (creatingNewSubject || !selectedSubjectId) {
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
  }, [selectedSubjectId, creatingNewSubject])

  const handleSearchFigures = useCallback(async (query: string) => {
    const results = await searchPublicFigures(query)
    return results.map((f) => ({ id: f.id, label: f.name }))
  }, [])

  const handleSearchSubjects = useCallback(async (query: string) => {
    const results = await searchSubjects(query)
    return results.map((s) => ({ id: s.id, label: s.title }))
  }, [])

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(undefined)
      setFieldErrors(undefined)
      setIsPending(true)

      const formData = new FormData()

      // Public figure
      if (creatingNewFigure) {
        const photoFile = photoInputRef.current?.files?.[0]
        if (photoFile && photoFile.size > MAX_PHOTO_SIZE) {
          setFieldErrors({ 'newPublicFigure.photo': 'La photo ne doit pas dépasser 30 Mo.' })
          setIsPending(false)
          return
        }
        formData.set('new_publicFigure_name', newFigureName)
        formData.set('new_publicFigure_presentation', newFigurePresentation)
        formData.set('new_publicFigure_wikipediaUrl', newFigureWikipediaUrl)
        formData.set('new_publicFigure_websiteUrl', newFigureWebsiteUrl)
        if (photoFile) {
          formData.set('new_publicFigure_photo', photoFile)
        }
      } else {
        formData.set('publicFigureId', selectedFigureId)
      }

      // Subject
      if (creatingNewSubject) {
        formData.set('new_subject_title', newSubjectTitle)
        formData.set('new_subject_presentation', newSubjectPresentation)
        formData.set('new_subject_problem', newSubjectProblem)
      } else {
        formData.set('subjectId', selectedSubjectId)
      }

      // Position
      if (creatingNewPosition) {
        formData.set('new_position_title', newPositionTitle)
        formData.set('new_position_description', newPositionDescription)
      } else {
        formData.set('positionId', selectedPositionId)
      }

      // Evidence
      const form = e.currentTarget
      formData.set('sourceName', getFieldValue(form, 'sourceName'))
      formData.set('sourceUrl', getFieldValue(form, 'sourceUrl'))
      formData.set('quote', getFieldValue(form, 'quote'))
      formData.set('factDate', getFieldValue(form, 'factDate'))

      try {
        const result: ActionResult = await contributeStatementAction(formData)

        if (!result.success) {
          if (result.error) {
            setError(result.error)
          }
          if (result.fieldErrors) {
            setFieldErrors(result.fieldErrors)
          }
        } else {
          router.push(`/s/${result.subjectSlug}`)
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('Body exceeded')) {
          setError('Le fichier envoyé est trop volumineux. Réduisez la taille de la photo.')
        } else {
          setError('Une erreur inattendue est survenue. Veuillez réessayer.')
        }
      } finally {
        setIsPending(false)
      }
    },
    [
      creatingNewFigure,
      creatingNewSubject,
      creatingNewPosition,
      selectedFigureId,
      selectedSubjectId,
      selectedPositionId,
      newFigureName,
      newFigurePresentation,
      newFigureWikipediaUrl,
      newFigureWebsiteUrl,
      newSubjectTitle,
      newSubjectPresentation,
      newSubjectProblem,
      newPositionTitle,
      newPositionDescription,
      router,
    ],
  )

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <FormError message={error} />}

      {/* Section 1: Personnalité */}
      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>Personnalité</legend>

        {!creatingNewFigure ? (
          <div className={styles.sectionContent}>
            <Combobox
              label="Rechercher une personnalité"
              id="publicFigureId"
              name="publicFigureId"
              required={!creatingNewFigure}
              placeholder="Tapez un nom..."
              onSearch={handleSearchFigures}
              onSelect={setSelectedFigureId}
            />
            {canAddPersonality && (
              <Button
                type="button"
                variant="link"
                size="small"
                onClick={() => setCreatingNewFigure(true)}
              >
                Nouvelle personnalité
              </Button>
            )}
          </div>
        ) : (
          <div className={styles.sectionContent}>
            <TextField
              label="Nom"
              id="new_publicFigure_name"
              required
              placeholder="ex : Albert Camus, Simone Veil..."
              value={newFigureName}
              onChange={(e) => setNewFigureName(e.target.value)}
              error={fieldErrors?.['newPublicFigure.name']}
            />
            <TextArea
              label="Présentation"
              id="new_publicFigure_presentation"
              required
              placeholder="Courte présentation de la personnalité (min. 10 caractères)"
              rows={3}
              value={newFigurePresentation}
              onChange={(e) => setNewFigurePresentation(e.target.value)}
              error={fieldErrors?.['newPublicFigure.presentation']}
            />
            <TextField
              label="URL Wikipedia"
              id="new_publicFigure_wikipediaUrl"
              required
              placeholder="https://fr.wikipedia.org/wiki/..."
              value={newFigureWikipediaUrl}
              onChange={(e) => setNewFigureWikipediaUrl(e.target.value)}
              error={fieldErrors?.['newPublicFigure.wikipediaUrl']}
            />
            <TextField
              label="Site web (optionnel)"
              id="new_publicFigure_websiteUrl"
              placeholder="https://..."
              value={newFigureWebsiteUrl}
              onChange={(e) => setNewFigureWebsiteUrl(e.target.value)}
            />
            <div className={styles.fileField}>
              <label className={styles.fileLabel} htmlFor="new_publicFigure_photo">
                Photo
              </label>
              <input
                className={styles.fileInput}
                id="new_publicFigure_photo"
                type="file"
                accept="image/jpeg,image/png"
                required
                ref={photoInputRef}
              />
              {fieldErrors?.['newPublicFigure.photo'] && (
                <span className={styles.fieldError}>{fieldErrors['newPublicFigure.photo']}</span>
              )}
            </div>
            <Button
              type="button"
              variant="link"
              size="small"
              onClick={() => setCreatingNewFigure(false)}
            >
              Annuler
            </Button>
          </div>
        )}
      </fieldset>

      {/* Section 2: Sujet */}
      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>Sujet</legend>

        {!creatingNewSubject ? (
          <div className={styles.sectionContent}>
            <Combobox
              label="Rechercher un sujet"
              id="subjectId"
              name="subjectId"
              required={!creatingNewSubject}
              placeholder="Tapez un sujet..."
              onSearch={handleSearchSubjects}
              onSelect={(id) => setSelectedSubjectId(id)}
            />
            {canAddSubject && (
              <Button
                type="button"
                variant="link"
                size="small"
                onClick={() => setCreatingNewSubject(true)}
              >
                Nouveau sujet
              </Button>
            )}
          </div>
        ) : (
          <div className={styles.sectionContent}>
            <TextField
              label="Titre"
              id="new_subject_title"
              required
              placeholder="ex : Faut-il interdire les SUV ?"
              value={newSubjectTitle}
              onChange={(e) => setNewSubjectTitle(e.target.value)}
              error={fieldErrors?.['newSubject.title']}
            />
            <TextArea
              label="Présentation"
              id="new_subject_presentation"
              required
              placeholder="Présentation du sujet (min. 10 caractères)"
              rows={3}
              value={newSubjectPresentation}
              onChange={(e) => setNewSubjectPresentation(e.target.value)}
              error={fieldErrors?.['newSubject.presentation']}
            />
            <TextArea
              label="Problématique"
              id="new_subject_problem"
              required
              placeholder="Problématique du sujet (min. 10 caractères)"
              rows={3}
              value={newSubjectProblem}
              onChange={(e) => setNewSubjectProblem(e.target.value)}
              error={fieldErrors?.['newSubject.problem']}
            />
            <Button
              type="button"
              variant="link"
              size="small"
              onClick={() => {
                setCreatingNewSubject(false)
                setCreatingNewPosition(false)
              }}
            >
              Annuler
            </Button>
          </div>
        )}
      </fieldset>

      {/* Section 3: Position */}
      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>Position</legend>

        {!creatingNewPosition ? (
          <div className={styles.sectionContent}>
            <div className={styles.selectField}>
              <label className={styles.selectLabel} htmlFor="positionId">
                Position sur le sujet
              </label>
              <select
                className={styles.selectInput}
                id="positionId"
                name="positionId"
                required={!creatingNewPosition}
                value={selectedPositionId}
                onChange={(e) => setSelectedPositionId(e.target.value)}
                disabled={!selectedSubjectId || loadingPositions || creatingNewSubject}
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
            {canAddPosition && (
              <Button
                type="button"
                variant="link"
                size="small"
                onClick={() => setCreatingNewPosition(true)}
              >
                Nouvelle position
              </Button>
            )}
          </div>
        ) : (
          <div className={styles.sectionContent}>
            {creatingNewSubject && (
              <p className={styles.hint}>
                Le sujet étant nouveau, vous devez aussi créer une première position.
              </p>
            )}
            <TextField
              label="Titre de la position"
              id="new_position_title"
              required
              placeholder="ex : Pour l'interdiction"
              value={newPositionTitle}
              onChange={(e) => setNewPositionTitle(e.target.value)}
              error={fieldErrors?.['newPosition.title']}
            />
            <TextArea
              label="Description"
              id="new_position_description"
              required
              placeholder="Description de la position (min. 10 caractères)"
              rows={3}
              value={newPositionDescription}
              onChange={(e) => setNewPositionDescription(e.target.value)}
              error={fieldErrors?.['newPosition.description']}
            />
            {!creatingNewSubject && (
              <Button
                type="button"
                variant="link"
                size="small"
                onClick={() => setCreatingNewPosition(false)}
              >
                Annuler
              </Button>
            )}
          </div>
        )}
      </fieldset>

      {/* Section 4: Preuve */}
      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>Preuve</legend>

        <div className={styles.sectionContent}>
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
        </div>
      </fieldset>

      <div className={styles.actions}>
        <Button type="submit">
          {isPending ? 'Ajout en cours...' : 'Ajouter cette prise de position'}
        </Button>
      </div>
    </form>
  )
}

function getFieldValue(form: HTMLFormElement, name: string): string {
  const element = form.elements.namedItem(name)
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.value
  }
  return ''
}
