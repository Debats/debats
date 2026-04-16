'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { setSubjectThemesAction } from '../../../actions/set-subject-themes'
import ThemeSelector, { ThemeOption } from '../../../../components/ui/ThemeSelector'
import FormError from '../../../../components/ui/FormError'
import styles from './SubjectThemes.module.css'

interface SubjectThemesProps {
  subjectId: string
  availableThemes: ThemeOption[]
  selectedThemeIds: string[]
  primaryThemeId: string | null
}

export default function SubjectThemes({
  subjectId,
  availableThemes,
  selectedThemeIds: initialSelectedIds,
  primaryThemeId: initialPrimaryId,
}: SubjectThemesProps) {
  const router = useRouter()
  const [error, setError] = useState<string>()
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds)
  const [primaryId, setPrimaryId] = useState<string | null>(initialPrimaryId)

  const save = useCallback(
    async (themeIds: string[], primary: string | null) => {
      setError(undefined)
      const result = await setSubjectThemesAction(subjectId, themeIds, primary)
      if (result.success) {
        router.refresh()
      } else {
        setError(result.error)
      }
    },
    [subjectId, router],
  )

  const handleToggle = useCallback(
    (themeIds: string[]) => {
      setSelectedIds(themeIds)
      const newPrimary = primaryId && themeIds.includes(primaryId) ? primaryId : null
      setPrimaryId(newPrimary)
      save(themeIds, newPrimary)
    },
    [primaryId, save],
  )

  const handlePrimaryToggle = useCallback(
    (themeId: string) => {
      const newPrimary = primaryId === themeId ? null : themeId
      setPrimaryId(newPrimary)
      save(selectedIds, newPrimary)
    },
    [primaryId, selectedIds, save],
  )

  return (
    <div className={styles.container}>
      <label className={styles.label}>Thématiques</label>
      {error && <FormError message={error} />}
      <ThemeSelector
        themes={availableThemes}
        value={selectedIds}
        primaryId={primaryId}
        onChange={handleToggle}
        onPrimaryToggle={handlePrimaryToggle}
      />
      <p className={styles.hint}>
        Sélectionnez une ou plusieurs thématiques. Cliquez sur l&apos;étoile pour définir la
        thématique principale (utilisée pour le classement sur la page des sujets).
      </p>
    </div>
  )
}
