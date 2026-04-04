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
}

export default function SubjectThemes({
  subjectId,
  availableThemes,
  selectedThemeIds,
}: SubjectThemesProps) {
  const router = useRouter()
  const [error, setError] = useState<string>()

  const handleChange = useCallback(
    async (themeIds: string[]) => {
      setError(undefined)
      const result = await setSubjectThemesAction(subjectId, themeIds)
      if (result.success) {
        router.refresh()
      } else {
        setError(result.error)
      }
    },
    [subjectId, router],
  )

  return (
    <div className={styles.container}>
      <label className={styles.label}>Thématiques</label>
      {error && <FormError message={error} />}
      <ThemeSelector themes={availableThemes} value={selectedThemeIds} onChange={handleChange} />
      <p className={styles.hint}>
        Sélectionnez une ou plusieurs thématiques. Les changements sont enregistrés immédiatement.
      </p>
    </div>
  )
}
