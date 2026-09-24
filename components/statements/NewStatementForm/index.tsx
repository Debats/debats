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
import {
  STATEMENT_TYPES,
  STATEMENT_TYPE_LABELS,
  parseStatementType,
} from '../../../domain/entities/statement'
import Combobox from '../../ui/Combobox'
import ComingSoon from '../../ui/ComingSoon'
import Segmented from '../../ui/Segmented'
import TextField from '../../ui/TextField'
import TextArea from '../../ui/TextArea'
import Button from '../../ui/Button'
import FormError from '../../ui/FormError'
import FormSuccess from '../../ui/FormSuccess'
import { useStatementDraft } from '../StatementDraft'
import styles from './NewStatementForm.module.css'

interface NewStatementFormProps {
  initialFigure?: { id: string; name: string }
  initialSubject?: { id: string; title: string; slug?: string }
}

export default function NewStatementForm({ initialFigure, initialSubject }: NewStatementFormProps) {
  const { updateDraft } = useStatementDraft()

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

  const selectPosition = useCallback(
    (id: string) => {
      setSelectedPositionId(id)
      updateDraft({ positionTitle: positions.find((p) => p.id === id)?.title ?? '' })
    },
    [positions, updateDraft],
  )

  /** Les champs libres restent non contrôlés ; l'aperçu se met à jour par délégation. */
  const handleFormChange = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      const form = e.currentTarget
      updateDraft({
        quote: getFieldValue(form, 'quote'),
        sourceName: getFieldValue(form, 'sourceName'),
        statedAt: getFieldValue(form, 'statedAt'),
        statementType: parseStatementType(getFieldValue(form, 'statementType')),
      })
    },
    [updateDraft],
  )

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
      formData.set('statementType', getFieldValue(form, 'statementType'))
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
    <form onSubmit={handleSubmit} onChange={handleFormChange} className={styles.form}>
      {error && <FormError message={error} />}

      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>
          <span className={styles.step}>1</span> Qui prend position ?
        </legend>
        <Segmented
          ariaLabel="Type d’acteur"
          active="Une personnalité"
          items={[{ label: 'Une personnalité' }, { label: 'Une organisation', soon: true }]}
        />
        <Combobox
          label="Personnalité"
          id="publicFigureId"
          name="publicFigureId"
          required
          placeholder="Tapez un nom…"
          onSearch={handleSearchFigures}
          onSelect={(id, label) => {
            setSelectedFigureId(id)
            updateDraft({ figureName: label })
          }}
          initialItem={
            initialFigure ? { id: initialFigure.id, label: initialFigure.name } : undefined
          }
        />
        <p className={styles.hint}>
          La personnalité doit avoir fait l’objet d’au moins deux publications dans des sources
          indépendantes. Elle n’existe pas encore ?{' '}
          <Link href="/p/ajouter" className={styles.hintLink}>
            Créer une personnalité
          </Link>
        </p>
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>
          <span className={styles.step}>2</span> Sur quoi ?
        </legend>
        <Combobox
          label="Sujet"
          id="subjectId"
          name="subjectId"
          required
          placeholder="Tapez un sujet…"
          onSearch={handleSearchSubjects}
          onSelect={(id, label) => {
            setSelectedSubjectId(id)
            setSelectedSubjectSlug(subjectSlugMapRef.current.get(id) ?? '')
            setPositions([])
            setSelectedPositionId('')
            setLoadingPositions(!!id)
            updateDraft({ subjectTitle: label, positionTitle: '' })
          }}
          initialItem={
            initialSubject ? { id: initialSubject.id, label: initialSubject.title } : undefined
          }
        />
        <p className={styles.hint}>
          Ce sujet n’existe pas encore ?{' '}
          <Link href="/s/ajouter" className={styles.hintLink}>
            Créer un sujet
          </Link>
        </p>

        <div className={styles.field}>
          <span className={styles.label}>Position défendue</span>
          {!selectedSubjectId ? (
            <p className={styles.hint}>Choisissez d’abord un sujet.</p>
          ) : loadingPositions ? (
            <p className={styles.hint}>Chargement des positions…</p>
          ) : positions.length === 0 ? (
            <p className={styles.hint}>Ce sujet n’a pas encore de position.</p>
          ) : (
            <div className={styles.options} role="radiogroup" aria-label="Position défendue">
              {positions.map((position) => (
                <label
                  key={position.id}
                  className={
                    position.id === selectedPositionId
                      ? `${styles.option} ${styles.optionOn}`
                      : styles.option
                  }
                >
                  <input
                    type="radio"
                    name="positionId"
                    value={position.id}
                    required
                    checked={position.id === selectedPositionId}
                    onChange={() => selectPosition(position.id)}
                    className={styles.radio}
                  />
                  <span className={styles.optionTitle}>{position.title}</span>
                </label>
              ))}
            </div>
          )}
          {selectedSubjectId && !loadingPositions && (
            <p className={styles.hint}>
              Aucune position ne correspond ?{' '}
              <Link
                href={`/s/${selectedSubjectSlug || selectedSubjectId}/nouvelle-position`}
                className={styles.hintLink}
              >
                Proposer une nouvelle position
              </Link>
            </p>
          )}
        </div>
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>
          <span className={styles.step}>3</span> Sur quelles bases ?
        </legend>
        <TextArea
          label="Citation"
          id="quote"
          name="quote"
          required
          placeholder="Les mots exacts de la personnalité (10 caractères au moins)"
          rows={4}
          error={fieldErrors?.quote}
        />
        <p className={styles.hint}>
          Recopiez les mots exacts, sans reformuler ni couper une phrase de manière à en changer le
          sens.
        </p>

        <div className={styles.row}>
          <TextField
            label="Nom de la source"
            id="sourceName"
            name="sourceName"
            required
            placeholder="ex : Le Monde, France Inter"
            error={fieldErrors?.sourceName}
          />
          <div className={styles.field}>
            <label className={styles.label} htmlFor="statedAt">
              Date de la prise de position
            </label>
            <input className={styles.control} id="statedAt" name="statedAt" type="date" required />
            {fieldErrors?.statedAt && (
              <span className={styles.fieldError}>{fieldErrors.statedAt}</span>
            )}
          </div>
        </div>

        <TextField
          label="Adresse de la source (facultatif)"
          id="sourceUrl"
          name="sourceUrl"
          placeholder="https://…"
        />

        <div className={styles.field}>
          <span className={styles.label}>Type de prise de position</span>
          <div className={styles.types} role="radiogroup" aria-label="Type de prise de position">
            {STATEMENT_TYPES.map((type, index) => (
              <label key={type} className={styles.type}>
                <input
                  type="radio"
                  name="statementType"
                  value={type}
                  defaultChecked={index === 0}
                  className={styles.radio}
                />
                <span className={styles.typeLabel}>{STATEMENT_TYPE_LABELS[type]}</span>
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <ComingSoon as="div" className={styles.section}>
        <p className={styles.sectionTitle}>
          <span className={styles.step}>4</span> Arguments mobilisés
        </p>
        <p className={styles.hint}>
          Cocher les arguments réellement présents dans la citation permettra de cartographier les
          raisonnements, pas seulement les camps.
        </p>
      </ComingSoon>

      <div className={styles.actions}>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Ajout en cours…' : 'Proposer la prise de position'}
        </Button>
        <ComingSoon>
          <span className={styles.draftAction}>Enregistrer le brouillon</span>
        </ComingSoon>
      </div>
    </form>
  )
}

function getFieldValue(form: HTMLFormElement, name: string): string {
  const element = form.elements.namedItem(name)
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.value
  }
  if (element instanceof RadioNodeList) {
    return element.value
  }
  return ''
}
