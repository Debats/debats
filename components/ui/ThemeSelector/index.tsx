'use client'

import { ToggleGroup } from 'radix-ui'
import styles from './ThemeSelector.module.css'

export interface ThemeOption {
  id: string
  name: string
}

interface ThemeSelectorProps {
  themes: ThemeOption[]
  value: string[]
  primaryId?: string | null
  onChange: (themeIds: string[]) => void
  onPrimaryToggle?: (themeId: string) => void
}

export default function ThemeSelector({
  themes,
  value,
  primaryId,
  onChange,
  onPrimaryToggle,
}: ThemeSelectorProps) {
  return (
    <ToggleGroup.Root
      type="multiple"
      value={value}
      onValueChange={onChange}
      className={styles.root}
    >
      {themes.map((theme) => {
        const isSelected = value.includes(theme.id)
        const isPrimary = theme.id === primaryId

        return (
          <span key={theme.id} className={styles.itemWrapper}>
            <ToggleGroup.Item value={theme.id} className={styles.item}>
              {theme.name}
            </ToggleGroup.Item>
            {isSelected && onPrimaryToggle && (
              <button
                type="button"
                className={`${styles.starButton} ${isPrimary ? styles.starActive : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onPrimaryToggle(theme.id)
                }}
                aria-label={
                  isPrimary
                    ? `Retirer ${theme.name} comme thématique principale`
                    : `Définir ${theme.name} comme thématique principale`
                }
                title={isPrimary ? 'Thématique principale' : 'Définir comme principale'}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M6 0l1.76 3.57 3.94.57-2.85 2.78.67 3.93L6 8.89 2.48 10.85l.67-3.93L.3 4.14l3.94-.57z" />
                </svg>
              </button>
            )}
          </span>
        )
      })}
    </ToggleGroup.Root>
  )
}
