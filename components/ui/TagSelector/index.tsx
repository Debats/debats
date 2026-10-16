'use client'

import { ToggleGroup } from 'radix-ui'
import styles from './TagSelector.module.css'

export interface TagOption {
  id: string
  name: string
}

interface TagSelectorProps {
  options: TagOption[]
  value: string[]
  onChange: (ids: string[]) => void
  ariaLabel: string
}

/** Choix multiple parmi une liste fermée d'étiquettes, en pilules à bascule. */
export default function TagSelector({ options, value, onChange, ariaLabel }: TagSelectorProps) {
  return (
    <ToggleGroup.Root
      type="multiple"
      value={value}
      onValueChange={onChange}
      aria-label={ariaLabel}
      className={styles.root}
    >
      {options.map((option) => (
        <ToggleGroup.Item key={option.id} value={option.id} className={styles.item}>
          {option.name}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
