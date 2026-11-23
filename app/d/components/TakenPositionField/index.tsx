'use client'

import { useCallback, useRef, useState } from 'react'
import * as Sentry from '@sentry/nextjs'
import { getPositionsForSubject, PositionOption } from '../../../actions/get-positions-for-subject'
import { searchSubjects } from '../../../actions/search-subjects'
import Combobox from '../../../../components/ui/Combobox'
import TextArea from '../../../../components/ui/TextArea'
import styles from './TakenPositionField.module.css'

/** One position a joint declaration takes, while it is being typed */
export interface TakenPositionDraft {
  /** The subject chosen, in the shape its Combobox takes back */
  subject?: { id: string; label: string }
  positionId: string
  quote: string
}

export const EMPTY_TAKEN_POSITION: TakenPositionDraft = { positionId: '', quote: '' }

interface TakenPositionFieldProps {
  /** Tells this field's inputs from the next one's: ids are unique in a page */
  id: string
  value: TakenPositionDraft
  onChange: (value: TakenPositionDraft) => void
  /** Absent when the field cannot go: a text takes at least one position */
  onRemove?: () => void
  /** What the command refused about the quote */
  error?: string
  /** What the command refused about the position */
  positionError?: string
}

const searchBySubjectTitle = async (query: string) =>
  (await searchSubjects(query)).map((subject) => ({ id: subject.id, label: subject.title }))

/**
 * Une position que le texte prend : le sujet, la position parmi celles du
 * sujet, et les mots du texte qui l'énoncent.
 */
export default function TakenPositionField({
  id,
  value,
  onChange,
  onRemove,
  error,
  positionError,
}: TakenPositionFieldProps) {
  const [options, setOptions] = useState<PositionOption[]>([])
  const [loading, setLoading] = useState(false)
  const [unreachable, setUnreachable] = useState(false)
  /** The subject whose positions are awaited: an answer about another one is stale */
  const awaited = useRef('')

  const loadPositions = useCallback((subjectId: string) => {
    awaited.current = subjectId
    setOptions([])
    setUnreachable(false)
    setLoading(!!subjectId)
    if (!subjectId) return
    getPositionsForSubject(subjectId).then(
      (found) => {
        if (awaited.current !== subjectId) return
        setOptions(found)
        setLoading(false)
      },
      (err) => {
        Sentry.captureException(err, { tags: { feature: 'joint-declaration-positions' } })
        if (awaited.current !== subjectId) return
        setUnreachable(true)
        setLoading(false)
      },
    )
  }, [])

  // The positions are those of the subject: choosing another one forgets the position ticked
  const chooseSubject = useCallback(
    (subjectId: string, label: string) => {
      onChange({
        ...value,
        subject: subjectId ? { id: subjectId, label } : undefined,
        positionId: '',
      })
      loadPositions(subjectId)
    },
    [loadPositions, onChange, value],
  )

  /** What is said under the position: that its list could not be read, or what the command refused */
  const positionNote = unreachable
    ? 'Les positions de ce sujet n’ont pas pu être chargées.'
    : positionError

  return (
    <div className={styles.taken}>
      <Combobox
        label="Sujet"
        id={`${id}-subject`}
        name={`${id}-subject`}
        required
        placeholder="Tapez un sujet…"
        onSearch={searchBySubjectTitle}
        onSelect={chooseSubject}
        initialItem={value.subject}
      />

      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${id}-position`}>
          Position que prend le texte
        </label>
        {/*
         * Never disabled once a subject is chosen: a disabled control takes no
         * part in the browser's validation, and the form would leave without a
         * position while they load. Empty and required, it holds the form back.
         */}
        <select
          id={`${id}-position`}
          className={styles.control}
          required
          disabled={!value.subject}
          aria-describedby={positionNote ? `${id}-position-note` : undefined}
          value={value.positionId}
          onChange={(e) => onChange({ ...value, positionId: e.target.value })}
        >
          <option value="">
            {!value.subject
              ? 'Choisissez d’abord un sujet'
              : loading
                ? 'Chargement des positions…'
                : unreachable
                  ? 'Positions indisponibles'
                  : options.length === 0
                    ? 'Ce sujet n’a pas encore de position'
                    : 'Sélectionner une position'}
          </option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title}
            </option>
          ))}
        </select>
        {positionNote && (
          <span id={`${id}-position-note`} className={styles.error} role="alert">
            {positionNote}
            {unreachable && value.subject && (
              <>
                {' '}
                <button
                  type="button"
                  className={styles.retry}
                  onClick={() => loadPositions(value.subject?.id ?? '')}
                >
                  Réessayer
                </button>
              </>
            )}
          </span>
        )}
      </div>

      <TextArea
        label="Les mots du texte qui énoncent cette position"
        id={`${id}-quote`}
        required
        rows={3}
        placeholder="La phrase exacte du texte, mot pour mot (10 caractères minimum)"
        value={value.quote}
        onChange={(e) => onChange({ ...value, quote: e.target.value })}
        error={error}
      />

      {onRemove && (
        <button type="button" className={styles.remove} onClick={onRemove}>
          Retirer ce sujet
        </button>
      )}
    </div>
  )
}
