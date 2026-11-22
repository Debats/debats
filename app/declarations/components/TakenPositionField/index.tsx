'use client'

import { useCallback, useState } from 'react'
import { getPositionsForSubject, PositionOption } from '../../../actions/get-positions-for-subject'
import { searchSubjects } from '../../../actions/search-subjects'
import Combobox from '../../../../components/ui/Combobox'
import TextArea from '../../../../components/ui/TextArea'
import styles from './TakenPositionField.module.css'

/** What a joint declaration says on one subject, while it is being typed */
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
}: TakenPositionFieldProps) {
  const [options, setOptions] = useState<PositionOption[]>([])
  const [loading, setLoading] = useState(false)

  // The positions are those of the subject: choosing another one forgets the position ticked
  const chooseSubject = useCallback(
    (subjectId: string, label: string) => {
      onChange({
        ...value,
        subject: subjectId ? { id: subjectId, label } : undefined,
        positionId: '',
      })
      setOptions([])
      if (!subjectId) return
      setLoading(true)
      void getPositionsForSubject(subjectId).then((found) => {
        setOptions(found)
        setLoading(false)
      })
    },
    [onChange, value],
  )

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
        <select
          id={`${id}-position`}
          className={styles.control}
          required
          disabled={!value.subject || loading}
          value={value.positionId}
          onChange={(e) => onChange({ ...value, positionId: e.target.value })}
        >
          <option value="">
            {!value.subject
              ? 'Choisissez d’abord un sujet'
              : loading
                ? 'Chargement des positions…'
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
