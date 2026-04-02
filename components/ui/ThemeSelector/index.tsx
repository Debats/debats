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
  onChange: (themeIds: string[]) => void
}

export default function ThemeSelector({ themes, value, onChange }: ThemeSelectorProps) {
  return (
    <ToggleGroup.Root
      type="multiple"
      value={value}
      onValueChange={onChange}
      className={styles.root}
    >
      {themes.map((theme) => (
        <ToggleGroup.Item key={theme.id} value={theme.id} className={styles.item}>
          {theme.name}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
