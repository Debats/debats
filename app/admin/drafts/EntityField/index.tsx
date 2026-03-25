'use client'

import { useState, useCallback, ReactNode } from 'react'
import Combobox from '../../../../components/ui/Combobox'
import ModeToggle from '../../../../components/ui/ModeToggle'
import styles from './EntityField.module.css'

type Mode = 'existing' | 'new'

export type EntityFieldValue =
  | { mode: 'existing'; id: string; name: string }
  | { mode: 'new'; name: string }

interface EntityFieldProps {
  label: string
  draftName: string
  initialSelection?: { id: string; label: string }
  onSearch: (query: string) => Promise<{ id: string; label: string }[]>
  onChange: (value: EntityFieldValue) => void
  children?: ReactNode
}

const MODE_OPTIONS: [{ value: Mode; label: string }, { value: Mode; label: string }] = [
  { value: 'existing', label: 'Sélectionner un existant' },
  { value: 'new', label: 'Créer / modifier' },
]

export default function EntityField({
  label,
  draftName,
  initialSelection,
  onSearch,
  onChange,
  children,
}: EntityFieldProps) {
  const [mode, setMode] = useState<Mode>(initialSelection ? 'existing' : 'new')

  const handleModeChange = useCallback(
    (newMode: Mode) => {
      setMode(newMode)
      if (newMode === 'new') {
        onChange({ mode: 'new', name: draftName })
      }
    },
    [draftName, onChange],
  )

  const handleSelect = useCallback(
    (id: string, selectedLabel: string) => {
      if (id && selectedLabel) {
        onChange({ mode: 'existing', id, name: selectedLabel })
      }
    },
    [onChange],
  )

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{label}</legend>

      <ModeToggle options={MODE_OPTIONS} value={mode} onChange={handleModeChange} />

      {mode === 'existing' ? (
        <Combobox
          label=""
          id={`entity-search-${label}`}
          name={`entity-search-${label}`}
          placeholder="Rechercher…"
          onSearch={onSearch}
          onSelect={handleSelect}
          initialItem={initialSelection}
        />
      ) : (
        <div className={styles.creationFields}>{children}</div>
      )}
    </fieldset>
  )
}
