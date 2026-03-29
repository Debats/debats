'use client'

import { useState, useCallback, useEffect } from 'react'
import { DraftStatement } from '../../../../domain/entities/draft-statement'
import { DraftResolution } from '../../../../domain/use-cases/resolve-draft'
import { DraftAmendments } from '../../../actions/amend-and-validate-draft-action'
import { searchPublicFigures } from '../../../actions/search-public-figures'
import { searchSubjects } from '../../../actions/search-subjects'
import { getPositionsForSubject, PositionOption } from '../../../actions/get-positions-for-subject'
import TextField from '../../../../components/ui/TextField'
import TextArea from '../../../../components/ui/TextArea'
import Button from '../../../../components/ui/Button'
import ModeToggle from '../../../../components/ui/ModeToggle'
import EntityField, { EntityFieldValue } from '../EntityField'
import { buildAmendments } from '../build-amendments'
import styles from './DraftAmendForm.module.css'

interface DraftAmendFormProps {
  draft: DraftStatement
  resolution: DraftResolution
  onSubmit: (amendments: DraftAmendments) => Promise<void>
  onCancel: () => void
  disabled: boolean
}

const POSITION_MODE_OPTIONS: [
  { value: 'existing'; label: string },
  { value: 'new'; label: string },
] = [
  { value: 'existing', label: 'Position existante' },
  { value: 'new', label: 'Nouvelle position' },
]

export default function DraftAmendForm({
  draft,
  resolution,
  onSubmit,
  onCancel,
  disabled,
}: DraftAmendFormProps) {
  const figureInitial = resolution.publicFigure.found
    ? { id: resolution.publicFigure.entity.id, label: resolution.publicFigure.entity.name }
    : undefined
  const subjectInitial = resolution.subject.found
    ? { id: resolution.subject.entity.id, label: resolution.subject.entity.title }
    : undefined

  // Figure
  const [figureMode, setFigureMode] = useState<EntityFieldValue['mode']>(
    figureInitial ? 'existing' : 'new',
  )
  const [figureName, setFigureName] = useState(draft.publicFigureName)
  const [figurePresentation, setFigurePresentation] = useState(
    draft.publicFigureData?.presentation ?? '',
  )
  const [figureWikipedia, setFigureWikipedia] = useState(draft.publicFigureData?.wikipediaUrl ?? '')
  const [figureNotorietySources, setFigureNotorietySources] = useState<string[]>(
    draft.publicFigureData?.notorietySources ?? ['', ''],
  )

  // Subject
  const [subjectMode, setSubjectMode] = useState<EntityFieldValue['mode']>(
    subjectInitial ? 'existing' : 'new',
  )
  const [subjectId, setSubjectId] = useState<string | null>(subjectInitial?.id ?? null)
  const [subjectTitle, setSubjectTitle] = useState(draft.subjectTitle)
  const [subjectPresentation, setSubjectPresentation] = useState(
    draft.subjectData?.presentation ?? '',
  )
  const [subjectProblem, setSubjectProblem] = useState(draft.subjectData?.problem ?? '')

  // Position
  const [positionMode, setPositionMode] = useState<'existing' | 'new'>(
    resolution.position.found ? 'existing' : 'new',
  )
  const [availablePositions, setAvailablePositions] = useState<PositionOption[]>([])
  const [selectedPositionId, setSelectedPositionId] = useState(
    resolution.position.found ? resolution.position.entity.id : '',
  )
  const [positionTitle, setPositionTitle] = useState(draft.positionTitle)
  const [positionDescription, setPositionDescription] = useState(
    draft.positionData?.description ?? '',
  )

  // Statement
  const [sourceName, setSourceName] = useState(draft.sourceName)
  const [quote, setQuote] = useState(draft.quote)

  useEffect(() => {
    if (subjectMode !== 'existing' || !subjectId) return

    const controller = new AbortController()
    getPositionsForSubject(subjectId).then((positions) => {
      if (controller.signal.aborted) return
      setAvailablePositions(positions)
      const match = positions.find((p) => p.title === draft.positionTitle)
      if (match) setSelectedPositionId(match.id)
    })
    return () => controller.abort()
  }, [subjectMode, subjectId, draft.positionTitle])

  const handleFigureChange = useCallback((value: EntityFieldValue) => {
    setFigureMode(value.mode)
    setFigureName(value.name)
  }, [])

  const handleSubjectChange = useCallback((value: EntityFieldValue) => {
    setSubjectMode(value.mode)
    setSubjectTitle(value.name)
    setSubjectId(value.mode === 'existing' ? value.id : null)
    setPositionMode('new')
    setSelectedPositionId('')
    setAvailablePositions([])
  }, [])

  const searchFigures = useCallback(
    async (query: string) =>
      (await searchPublicFigures(query)).map((f) => ({ id: f.id, label: f.name })),
    [],
  )

  const searchSubjectsAction = useCallback(
    async (query: string) =>
      (await searchSubjects(query)).map((s) => ({ id: s.id, label: s.title })),
    [],
  )

  const handleSubmit = useCallback(async () => {
    const selectedPosition = availablePositions.find((p) => p.id === selectedPositionId)
    const amendments = buildAmendments(draft, resolution, {
      figureMode,
      figureName,
      figurePresentation,
      figureWikipedia,
      figureNotorietySources,
      subjectMode,
      subjectTitle,
      subjectPresentation,
      subjectProblem,
      positionMode,
      selectedPositionTitle: selectedPosition?.title ?? null,
      positionTitle,
      positionDescription,
      sourceName,
      quote,
    })
    await onSubmit(amendments)
  }, [
    draft,
    resolution,
    figureMode,
    figureName,
    figurePresentation,
    figureWikipedia,
    figureNotorietySources,
    subjectMode,
    subjectTitle,
    subjectPresentation,
    subjectProblem,
    positionMode,
    selectedPositionId,
    availablePositions,
    positionTitle,
    positionDescription,
    sourceName,
    quote,
    onSubmit,
  ])

  return (
    <div className={styles.form}>
      <EntityField
        label="Personnalité"
        draftName={draft.publicFigureName}
        initialSelection={figureInitial}
        onSearch={searchFigures}
        onChange={handleFigureChange}
      >
        <TextField
          label="Nom"
          id="amend-figure-name"
          name="figureName"
          value={figureName}
          onChange={(e) => setFigureName(e.target.value)}
        />
        <TextArea
          label="Présentation"
          id="amend-figure-presentation"
          name="figurePresentation"
          value={figurePresentation}
          onChange={(e) => setFigurePresentation(e.target.value)}
          rows={2}
        />
        <TextField
          label="URL Wikipedia"
          id="amend-figure-wikipedia"
          name="figureWikipedia"
          value={figureWikipedia}
          onChange={(e) => setFigureWikipedia(e.target.value)}
        />
        {!figureWikipedia && (
          <div className={styles.notorietySources}>
            <label className={styles.notorietyLabel}>
              Sources de notoriété (min. 2, requises sans Wikipedia)
            </label>
            {figureNotorietySources.map((url, index) => (
              <div key={index} className={styles.notorietyRow}>
                <TextField
                  label={`Source ${index + 1}`}
                  id={`amend-figure-notoriety-${index}`}
                  name={`figureNotoriety${index}`}
                  value={url}
                  onChange={(e) => {
                    const next = [...figureNotorietySources]
                    next[index] = e.target.value
                    setFigureNotorietySources(next)
                  }}
                />
                {figureNotorietySources.length > 2 && (
                  <button
                    type="button"
                    className={styles.removeSource}
                    onClick={() =>
                      setFigureNotorietySources(
                        figureNotorietySources.filter((_, i) => i !== index),
                      )
                    }
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className={styles.addSource}
              onClick={() => setFigureNotorietySources([...figureNotorietySources, ''])}
            >
              + Ajouter une source
            </button>
          </div>
        )}
      </EntityField>

      <EntityField
        label="Sujet"
        draftName={draft.subjectTitle}
        initialSelection={subjectInitial}
        onSearch={searchSubjectsAction}
        onChange={handleSubjectChange}
      >
        <TextField
          label="Titre"
          id="amend-subject-title"
          name="subjectTitle"
          value={subjectTitle}
          onChange={(e) => setSubjectTitle(e.target.value)}
        />
        <TextArea
          label="Présentation"
          id="amend-subject-presentation"
          name="subjectPresentation"
          value={subjectPresentation}
          onChange={(e) => setSubjectPresentation(e.target.value)}
          rows={2}
        />
        <TextArea
          label="Problématique"
          id="amend-subject-problem"
          name="subjectProblem"
          value={subjectProblem}
          onChange={(e) => setSubjectProblem(e.target.value)}
          rows={2}
        />
      </EntityField>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Position</legend>

        {subjectMode === 'existing' && availablePositions.length > 0 && (
          <ModeToggle
            options={POSITION_MODE_OPTIONS}
            value={positionMode}
            onChange={setPositionMode}
          />
        )}

        {positionMode === 'existing' && availablePositions.length > 0 ? (
          <div className={styles.selectField}>
            <label className={styles.selectLabel} htmlFor="amend-position-select">
              Position
            </label>
            <select
              id="amend-position-select"
              className={styles.select}
              value={selectedPositionId}
              onChange={(e) => setSelectedPositionId(e.target.value)}
            >
              <option value="">— Choisir une position —</option>
              {availablePositions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <TextField
              label="Titre"
              id="amend-position-title"
              name="positionTitle"
              value={positionTitle}
              onChange={(e) => setPositionTitle(e.target.value)}
            />
            <TextArea
              label="Description"
              id="amend-position-description"
              name="positionDescription"
              value={positionDescription}
              onChange={(e) => setPositionDescription(e.target.value)}
              rows={2}
            />
          </>
        )}
      </fieldset>

      <TextField
        label="Source"
        id="amend-source"
        name="sourceName"
        value={sourceName}
        onChange={(e) => setSourceName(e.target.value)}
      />

      <TextArea
        label="Citation"
        id="amend-quote"
        name="quote"
        value={quote}
        onChange={(e) => setQuote(e.target.value)}
        rows={3}
      />

      <div className={styles.actions}>
        <Button size="small" onClick={handleSubmit} disabled={disabled}>
          {disabled ? 'Validation…' : 'Valider avec les modifications'}
        </Button>
        <Button variant="link" size="small" onClick={onCancel} disabled={disabled}>
          Annuler
        </Button>
      </div>
    </div>
  )
}
