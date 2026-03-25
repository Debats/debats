'use client'

import styles from './ModeToggle.module.css'

interface ModeToggleOption<T extends string> {
  value: T
  label: string
}

interface ModeToggleProps<T extends string> {
  options: [ModeToggleOption<T>, ModeToggleOption<T>]
  value: T
  onChange: (value: T) => void
}

export default function ModeToggle<T extends string>({
  options,
  value,
  onChange,
}: ModeToggleProps<T>) {
  return (
    <div className={styles.toggle}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`${styles.button} ${value === option.value ? styles.active : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
