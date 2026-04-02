'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { deleteThemeAction } from '../../actions/delete-theme'
import ConfirmAction from '../../../components/ui/ConfirmAction'
import styles from '../themes.module.css'

interface ThemeData {
  id: string
  name: string
  slug: string
  description: string
}

interface ThemeListProps {
  themes: ThemeData[]
  canManage: boolean
}

export default function ThemeList({ themes, canManage }: ThemeListProps) {
  const router = useRouter()

  const handleDelete = useCallback(
    async (themeId: string) => {
      const result = await deleteThemeAction(themeId)
      if (result.success) {
        router.refresh()
      }
    },
    [router],
  )

  if (themes.length === 0) {
    return <p className={styles.empty}>Aucune thématique pour le moment.</p>
  }

  return (
    <div className={styles.list}>
      {themes.map((theme) => (
        <div key={theme.id} className={styles.item}>
          <div className={styles.info}>
            <p className={styles.name}>{theme.name}</p>
            <p className={styles.description}>{theme.description}</p>
          </div>
          {canManage && (
            <div className={styles.actions}>
              <ConfirmAction
                triggerLabel="Supprimer"
                warning={`Supprimer la thématique « ${theme.name} » ? Les sujets associés perdront cette thématique.`}
                onConfirm={() => handleDelete(theme.id)}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
