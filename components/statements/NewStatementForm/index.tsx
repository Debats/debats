'use client'

import { useState, useCallback, useEffect, useRef, FormEvent } from 'react'
import Link from 'next/link'
import * as Sentry from '@sentry/nextjs'
import { addStatementAction, ActionResult } from '../../../app/actions/add-statement'
import { searchPublicFigures } from '../../../app/actions/search-public-figures'
import { searchSubjects } from '../../../app/actions/search-subjects'
import {
  getPositionsForSubject,
  PositionOption,
} from '../../../app/actions/get-positions-for-subject'
import { FieldErrors } from '../../../domain/use-cases/create-statement'
import Combobox from '../../ui/Combobox'
import TextField from '../../ui/TextField'
import TextArea from '../../ui/TextArea'
import Button from '../../ui/Button'
import FormError from '../../ui/FormError'
import FormSuccess from '../../ui/FormSuccess'
import styles from './NewStatementForm.module.css'

interface NewStatementFormProps {
  initialFigure?: { id: string; name: string }
  initialSubject?: { id: string; title: string; slug?: string }
}

export default function NewStatementForm({ initialFigure, initialSubject }: NewStatementFormProps) {
  const [selectedFigureId, setSelectedFigureId] = useState(initialFigure?.id ?? '')
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubject?.id ?? '')
  const [selectedSubjectSlug, setSelectedSubjectSlug] = useState(initialSubject?.slug ?? '')
  const [selectedPositionId, setSelectedPositionId] = useState('')
  const subjectSlugMapRef = useRef<Map<string, string>>(new Map())

  const [positions, setPositions] = useState<PositionOption[]>([])
  const [loadingPositions, setLoadingPositions] = useState(!!initialSubject?.id)

  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [isPending, setIsPending] = useState(false)
  const [successResult, setSuccessResult] = useState<{
    subjectSlug: string
    figureSlug: string
  }>()

  useEffect(() => {
    if (!selectedSubjectId) return

    const controller = new AbortController()
    getPositionsForSubject(selectedSubjectId).then((result) => {
      if (controller.signal.aborted) return
      setPositions(result)
      setLoadingPositions(false)
    })
    return () => controller.abort()
  }, [selectedSubjectId])

  const handleSearchFigures = useCallback(async (query: string) => {
    const results = await searchPublicFigures(query)
    return results.map((f) => ({ id: f.id, label: f.name }))
  }, [])

  const handleSearchSubjects = useCallback(async (query: string) => {
    const results = await searchSubjects(query)
    for (const s of results) {
      subjectSlugMapRef.current.set(s.id, s.slug)
    }
    return results.map((s) => ({ id: s.id, label: s.title }))
  }, [])

  const resetForm = useCallback(() => {
    setSelectedFigureId('')
    setSelectedSubjectId('')
    setSelectedSubjectSlug('')
    setSelectedPositionId('')
    setPositions([])
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
      formData.set('publicFigureId', selectedFigureId)
      formData.set('subjectId', selectedSubjectId)
      formData.set('positionId', selectedPositionId)

      const form = e.currentTarget
      formData.set('sourceName', getFieldValue(form, 'sourceName'))
      formData.set('sourceUrl', getFieldValue(form, 'sourceUrl'))
      formData.set('quote', getFieldValue(form, 'quote'))
      formData.set('statedAt', getFieldValue(form, 'statedAt'))

      try {
        const result: ActionResult = await addStatementAction(formData)

        setIsPending(false)

        if (!result.success) {
          if (result.error) {
            setError(result.error)
          }
          if (result.fieldErrors) {
            setFieldErrors(result.fieldErrors)
          }
        } else {
          setSuccessResult({
            subjectSlug: result.subjectSlug,
            figureSlug: result.figureSlug,
          })
        }
      } catch (err) {
        Sentry.captureException(err)
        setError('Une erreur inattendue est survenue. Veuillez réessayer.')
        setIsPending(false)
      }
    },
    [selectedFigureId, selectedSubjectId, selectedPositionId],
  )

  if (successResult) {
    const secondaryActions = []
    if (successResult.subjectSlug) {
      secondaryActions.push({
        label: 'Voir le sujet',
        href: `/s/${successResult.subjectSlug}`,
      })
    }
    if (successResult.figureSlug) {
      secondaryActions.push({
        label: 'Voir la personnalité',
        href: `/p/${successResult.figureSlug}`,
      })
    }

    return (
      <FormSuccess
        title="Prise de position ajoutée !"
        primaryAction={{
          label: 'Ajouter une autre prise de position',
          href: '/nouvelle-prise-de-position',
        }}
        secondaryActions={secondaryActions}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <FormError message={error} />}

      {/* Section 1: Personnalité */}
      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>Personnalité</legend>
        <div className={styles.sectionContent}>
          <Combobox
            label="Rechercher une personnalité"
            id="publicFigureId"
            name="publicFigureId"
            required
            placeholder="Tapez un nom..."
            onSearch={handleSearchFigures}
            onSelect={setSelectedFigureId}
            initialItem={
              initialFigure ? { id: initialFigure.id, label: initialFigure.name } : undefined
            }
          />
          <p className={styles.guidance}>
            Cette personnalité n&apos;existe pas encore ?{' '}
            <Link href="/p/ajouter" className={styles.guidanceLink}>
              Créer une personnalité
            </Link>
          </p>
        </div>
      </fieldset>

      {/* Section 2: Sujet */}
      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>Sujet</legend>
        <div className={styles.sectionContent}>
          <Combobox
            label="Rechercher un sujet"
            id="subjectId"
            name="subjectId"
            required
            placeholder="Tapez un sujet..."
            onSearch={handleSearchSubjects}
            onSelect={(id) => {
              setSelectedSubjectId(id)
              setSelectedSubjectSlug(subjectSlugMapRef.current.get(id) ?? '')
              setPositions([])
              setSelectedPositionId('')
              setLoadingPositions(!!id)
            }}
            initialItem={
              initialSubject ? { id: initialSubject.id, label: initialSubject.title } : undefined
            }
          />
          <p className={styles.guidance}>
            Ce sujet n&apos;existe pas encore ?{' '}
            <Link href="/s/ajouter" className={styles.guidanceLink}>
              Créer un sujet
            </Link>
          </p>
        </div>
      </fieldset>

      {/* Section 3: Position */}
      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>Position</legend>
        <div className={styles.sectionContent}>
          <div className={styles.selectField}>
            <label className={styles.selectLabel} htmlFor="positionId">
              Position sur le sujet
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
          {selectedSubjectId && (
            <p className={styles.guidance}>
              Cette position n&apos;existe pas ?{' '}
              <Link
                href={`/s/${selectedSubjectSlug || selectedSubjectId}/nouvelle-position`}
                className={styles.guidanceLink}
              >
                Créer une position
              </Link>
            </p>
          )}
        </div>
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
            <label className={styles.dateLabel} htmlFor="statedAt">
              Date de la déclaration
            </label>
            <input
              className={styles.dateInput}
              id="statedAt"
              name="statedAt"
              type="date"
              required
            />
            {fieldErrors?.statedAt && (
              <span className={styles.fieldError}>{fieldErrors.statedAt}</span>
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
