'use client'

import { ReactNode } from 'react'
import { ToggleGroup } from 'radix-ui'
import styles from './TagSelector.module.css'

export interface TagOption {
  id: string
  name: string
}

export interface TagGroup {
  id: string
  /** Intitulé du groupe ; absent pour une liste plate */
  label?: string
  options: TagOption[]
}

interface TagSelectorProps {
  groups: TagGroup[]
  value: string[]
  onChange: (ids: string[]) => void
  ariaLabel: string
  /** Contenu ajouté dans la pilule d'une option cochée (un réglage, par exemple) */
  renderSelected?: (option: TagOption) => ReactNode
}

/** Choix multiple parmi une liste fermée d'étiquettes, en pilules à bascule, par groupe. */
export default function TagSelector({
  groups,
  value,
  onChange,
  ariaLabel,
  renderSelected,
}: TagSelectorProps) {
  return (
    <ToggleGroup.Root
      type="multiple"
      value={value}
      onValueChange={onChange}
      aria-label={ariaLabel}
      className={styles.root}
    >
      {groups.map((group) => (
        <div key={group.id} className={styles.group}>
          {group.label && <p className={styles.groupLabel}>{group.label}</p>}
          <div className={styles.items}>
            {group.options.map((option) => {
              const selected = value.includes(option.id)
              const extra = selected && renderSelected ? renderSelected(option) : null
              return (
                <div key={option.id} className={extra ? styles.pillWithExtra : styles.pill}>
                  <ToggleGroup.Item value={option.id} className={styles.item}>
                    {option.name}
                  </ToggleGroup.Item>
                  {extra}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </ToggleGroup.Root>
  )
}
