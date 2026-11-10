'use client'

import { useState, useCallback, useEffect } from 'react'
import { DraftStatement } from '../../../../domain/entities/draft-statement'
import { DraftResolution } from '../../../../domain/use-cases/resolve-draft'
import { isRevisable, RevisableField } from '../../../../domain/services/draft-revision'
import { DraftAmendments } from '../../../actions/draft-amendments'
import { searchPublicFigures } from '../../../actions/search-public-figures'
import { searchOrganisations } from '../../../actions/search-organisations'
import {
  ORGANISATION_TYPE_LABELS,
  ORGANISATION_TYPES,
  OrganisationType,
} from '../../../../domain/entities/organisation'
import { searchSubjects } from '../../../actions/search-subjects'
import { getPositionsForSubject, PositionOption } from '../../../actions/get-positions-for-subject'
import { StatementContentInput } from '../../../../domain/use-cases/validate-statement-fields'
import TextField from '../../../../components/ui/TextField'
import TextArea from '../../../../components/ui/TextArea'
import Button from '../../../../components/ui/Button'
import ModeToggle from '../../../../components/ui/ModeToggle'
import StatementContentFields from '../../../../components/statements/StatementContentFields'
import EntityField, { EntityFieldValue } from '../EntityField'
import DraftDialogue, { Sheet } from '../DraftDialogue'
import RevisedField from '../../../../components/ui/RevisedField'
import { amendValuesOf, buildAmendments } from '../build-amendments'
import { FIELD_INPUT_IDS, withValue } from '../revision-fields'
import { useDraftRevision } from '../useDraftRevision'
import styles from './DraftAmendForm.module.css'

interface DraftAmendFormProps {
  draft: DraftStatement
  resolution: DraftResolution
  /** Writes the amendments and validates the draft */
  onSubmit: (amendments: DraftAmendments) => Promise<void>
  /** Writes the amendments and keeps the draft for later */
  onSave: (amendments: DraftAmendments) => Promise<void>
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

const CONTENT_KEYS = ['quote', 'document', 'votedText', 'deed'] as const

/**
 * The draft as a form, with the assistant beside it.
 *
 * The form is the only state: what the assistant rewrites lands in it,
 * tinted and undoable field by field, and what a person types locks the
 * field away from the assistant. Nothing is written before « Valider » or
 * « Enregistrer », and the conversation dies with the form.
 */
export default function DraftAmendForm({
  draft,
  resolution,
  onSubmit,
  onSave,
  onCancel,
  disabled,
}: DraftAmendFormProps) {
  const { author } = draft
  const isOrganisation = author.kind === 'organisation'

  const [values, setValues] = useState(() => amendValuesOf(draft, resolution))
  const [availablePositions, setAvailablePositions] = useState<PositionOption[]>([])
  const [sheet, setSheet] = useState<Sheet>('bar')

  const openSheet = useCallback(() => setSheet('half'), [])
  const revision = useDraftRevision({
    values,
    setValues,
    author: { kind: author.kind, found: resolution.author.found },
    sourceUrl: draft.sourceUrl,
    onAnswered: openSheet,
  })

  /* A person writing a field: the value changes, and the assistant leaves it alone from now on */
  const write = useCallback(
    (field: RevisableField, value: string) => {
      setValues((current) => withValue(current, field, value))
      revision.edited(field)
    },
    [revision],
  )

  const writeContent = useCallback(
    (content: StatementContentInput) => {
      CONTENT_KEYS.filter((key) => content[key] !== values.content[key]).forEach(revision.edited)
      setValues((current) => ({ ...current, content }))
    },
    [revision, values.content],
  )

  useEffect(() => {
    if (values.subjectMode !== 'existing' || !values.subjectId) return

    const controller = new AbortController()
    getPositionsForSubject(values.subjectId).then((positions) => {
      if (controller.signal.aborted) return
      setAvailablePositions(positions)
      const match = positions.find((p) => p.title === draft.positionTitle)
      if (match) {
        setValues((current) =>
          current.selectedPositionId ? current : { ...current, selectedPositionId: match.id },
        )
      }
    })
    return () => controller.abort()
  }, [values.subjectMode, values.subjectId, draft.positionTitle])

  const handleAuthorChange = useCallback((value: EntityFieldValue) => {
    setValues((current) => ({ ...current, authorMode: value.mode, authorName: value.name }))
  }, [])

  const handleSubjectChange = useCallback((value: EntityFieldValue) => {
    setValues((current) => ({
      ...current,
      subjectMode: value.mode,
      subjectTitle: value.name,
      subjectId: value.mode === 'existing' ? value.id : null,
      positionMode: 'new',
      selectedPositionId: '',
    }))
    setAvailablePositions([])
  }, [])

  const searchAuthors = useCallback(
    async (query: string) =>
      isOrganisation
        ? (await searchOrganisations(query)).map((o) => ({ id: o.id, label: o.name }))
        : (await searchPublicFigures(query)).map((f) => ({ id: f.id, label: f.name })),
    [isOrganisation],
  )

  const searchSubjectsAction = useCallback(
    async (query: string) =>
      (await searchSubjects(query)).map((s) => ({ id: s.id, label: s.title })),
    [],
  )

  const amendments = useCallback(() => {
    const selected = availablePositions.find((p) => p.id === values.selectedPositionId)
    return buildAmendments(draft, resolution, {
      ...values,
      selectedPositionTitle: selected?.title ?? null,
    })
  }, [availablePositions, draft, resolution, values])

  const seeField = useCallback((field: RevisableField) => {
    setSheet('bar')
    const input = document.getElementById(FIELD_INPUT_IDS[field])
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    input?.focus({ preventScroll: true })
  }, [])

  const revisedField = (field: RevisableField) => ({
    revised: revision.revised[field] !== undefined,
    onUndo: () => revision.undo(field),
  })

  const subjectKey = `${values.subjectMode}-${values.subjectId ?? ''}`
  const subjectSelection =
    values.subjectMode === 'existing' && values.subjectId
      ? { id: values.subjectId, label: values.subjectTitle }
      : undefined
  const authorSelection = resolution.author.found
    ? { id: resolution.author.entity.id, label: resolution.author.entity.name }
    : undefined

  return (
    <div className={styles.workspace}>
      <div className={styles.form}>
        <EntityField
          label={isOrganisation ? 'Organisation' : 'Personnalité'}
          draftName={author.name}
          initialSelection={authorSelection}
          onSearch={searchAuthors}
          onChange={handleAuthorChange}
        >
          <RevisedField {...revisedField('authorName')}>
            <TextField
              label="Nom"
              id={FIELD_INPUT_IDS.authorName}
              value={values.authorName}
              onChange={(e) => write('authorName', e.target.value)}
              advice={revision.advice.authorName}
            />
          </RevisedField>
          {isOrganisation && (
            <div className={styles.selectField}>
              <label className={styles.selectLabel} htmlFor="amend-author-organisation-type">
                Type d’organisation
              </label>
              <select
                id="amend-author-organisation-type"
                className={styles.select}
                value={values.authorOrganisationType}
                onChange={(e) =>
                  setValues((current) => ({
                    ...current,
                    authorOrganisationType: e.target.value as OrganisationType,
                  }))
                }
              >
                {ORGANISATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ORGANISATION_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
          )}
          <RevisedField {...revisedField('authorPresentation')}>
            <TextArea
              label="Présentation"
              id={FIELD_INPUT_IDS.authorPresentation}
              value={values.authorPresentation}
              onChange={(e) => write('authorPresentation', e.target.value)}
              rows={2}
              advice={revision.advice.authorPresentation}
            />
          </RevisedField>
          <RevisedField {...revisedField('authorWikipedia')}>
            <TextField
              label="URL Wikipedia"
              id={FIELD_INPUT_IDS.authorWikipedia}
              value={values.authorWikipedia}
              onChange={(e) => write('authorWikipedia', e.target.value)}
              advice={revision.advice.authorWikipedia}
            />
          </RevisedField>
          {!values.authorWikipedia && (
            <div className={styles.notorietySources}>
              <label className={styles.notorietyLabel}>
                Sources de notoriété (min. 2, requises sans Wikipedia)
              </label>
              {values.authorNotorietySources.map((url, index) => (
                <div key={index} className={styles.notorietyRow}>
                  <TextField
                    label={`Source ${index + 1}`}
                    id={`amend-author-notoriety-${index}`}
                    value={url}
                    onChange={(e) => {
                      const next = [...values.authorNotorietySources]
                      next[index] = e.target.value
                      setValues((current) => ({ ...current, authorNotorietySources: next }))
                    }}
                  />
                  {values.authorNotorietySources.length > 2 && (
                    <button
                      type="button"
                      className={styles.removeSource}
                      onClick={() =>
                        setValues((current) => ({
                          ...current,
                          authorNotorietySources: current.authorNotorietySources.filter(
                            (_, i) => i !== index,
                          ),
                        }))
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
                onClick={() =>
                  setValues((current) => ({
                    ...current,
                    authorNotorietySources: [...current.authorNotorietySources, ''],
                  }))
                }
              >
                + Ajouter une source
              </button>
            </div>
          )}
        </EntityField>

        {/* Keyed on what it holds: an attachment the assistant proposes remounts it on the chosen subject */}
        <EntityField
          key={subjectKey}
          label="Sujet"
          draftName={draft.subjectTitle}
          initialSelection={subjectSelection}
          onSearch={searchSubjectsAction}
          onChange={handleSubjectChange}
        >
          <RevisedField {...revisedField('subjectTitle')}>
            <TextField
              label="Titre"
              id={FIELD_INPUT_IDS.subjectTitle}
              value={values.subjectTitle}
              onChange={(e) => write('subjectTitle', e.target.value)}
              advice={revision.advice.subjectTitle}
            />
          </RevisedField>
          <RevisedField {...revisedField('subjectPresentation')}>
            <TextArea
              label="Présentation"
              id={FIELD_INPUT_IDS.subjectPresentation}
              value={values.subjectPresentation}
              onChange={(e) => write('subjectPresentation', e.target.value)}
              rows={3}
              advice={revision.advice.subjectPresentation}
            />
          </RevisedField>
          <RevisedField {...revisedField('subjectProblem')}>
            <TextArea
              label="Problématique"
              id={FIELD_INPUT_IDS.subjectProblem}
              value={values.subjectProblem}
              onChange={(e) => write('subjectProblem', e.target.value)}
              rows={2}
              advice={revision.advice.subjectProblem}
            />
          </RevisedField>
        </EntityField>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Position</legend>

          {values.subjectMode === 'existing' && availablePositions.length > 0 && (
            <ModeToggle
              options={POSITION_MODE_OPTIONS}
              value={values.positionMode}
              onChange={(positionMode) => setValues((current) => ({ ...current, positionMode }))}
            />
          )}

          {values.positionMode === 'existing' && availablePositions.length > 0 ? (
            <div className={styles.selectField}>
              <label className={styles.selectLabel} htmlFor="amend-position-select">
                Position
              </label>
              <select
                id="amend-position-select"
                className={styles.select}
                value={values.selectedPositionId}
                onChange={(e) =>
                  setValues((current) => ({ ...current, selectedPositionId: e.target.value }))
                }
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
              <RevisedField {...revisedField('positionTitle')}>
                <TextField
                  label="Titre"
                  id={FIELD_INPUT_IDS.positionTitle}
                  value={values.positionTitle}
                  onChange={(e) => write('positionTitle', e.target.value)}
                  advice={revision.advice.positionTitle}
                />
              </RevisedField>
              <RevisedField {...revisedField('positionDescription')}>
                <TextArea
                  label="Description"
                  id={FIELD_INPUT_IDS.positionDescription}
                  value={values.positionDescription}
                  onChange={(e) => write('positionDescription', e.target.value)}
                  rows={2}
                  advice={revision.advice.positionDescription}
                />
              </RevisedField>
            </>
          )}
        </fieldset>

        <RevisedField {...revisedField('sourceName')}>
          <TextField
            label="Source"
            id={FIELD_INPUT_IDS.sourceName}
            value={values.sourceName}
            onChange={(e) => write('sourceName', e.target.value)}
            advice={revision.advice.sourceName}
          />
        </RevisedField>

        <StatementContentFields
          value={values.content}
          onChange={writeContent}
          advice={revision.advice}
          revised={Object.fromEntries(
            CONTENT_KEYS.filter((key) => revision.revised[key] !== undefined).map((key) => [
              key,
              () => revision.undo(key),
            ]),
          )}
        />

        <div className={styles.actions}>
          <Button size="small" onClick={() => void onSubmit(amendments())} disabled={disabled}>
            {disabled ? 'En cours…' : 'Valider le brouillon'}
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={() => void onSave(amendments())}
            disabled={disabled}
          >
            Enregistrer sans valider
          </Button>
          <Button variant="link" size="small" onClick={onCancel} disabled={disabled}>
            Annuler
          </Button>
        </div>
      </div>

      <DraftDialogue
        turns={revision.turns}
        status={revision.status}
        suggestions={revision.suggestions}
        revisedCount={Object.keys(revision.revised).filter(isRevisable).length}
        sheet={sheet}
        onSheet={setSheet}
        onAsk={(request) => void revision.ask(request)}
        onChoose={revision.choose}
        onSeeField={seeField}
      />
    </div>
  )
}
