'use client'

import { useRouter } from 'next/navigation'
import styles from './NavSelect.module.css'

export interface NavSelectOption {
  value: string
  label: string
  /** Where choosing this option leads */
  href: string
}

interface NavSelectProps {
  ariaLabel: string
  /** Ce que dit le sélecteur quand rien n'est choisi, et où mène ce choix */
  any: { label: string; href: string }
  options: NavSelectOption[]
  /** La valeur choisie, ou rien */
  value?: string
}

/** Un sélecteur qui mène à une autre adresse : le choix vit dans l'URL. */
export default function NavSelect({ ariaLabel, any, options, value }: NavSelectProps) {
  const router = useRouter()
  const go = (chosen: string) =>
    router.push(options.find((option) => option.value === chosen)?.href ?? any.href)

  return (
    <select
      className={styles.select}
      aria-label={ariaLabel}
      value={value ?? ''}
      onChange={(event) => go(event.target.value)}
    >
      <option value="">{any.label}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
