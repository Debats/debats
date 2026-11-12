import { ReactNode } from 'react'
import styles from './ChoiceCard.module.css'

interface ChoiceCardProps {
  /** Le libellé du choix */
  children: ReactNode
  /** Ce que le choix entraîne, sous le libellé */
  note?: ReactNode
  checked: boolean
  onChange: () => void
  /** Regroupe les choix pour le navigateur ; nécessaire avec `required` */
  name?: string
  /** Le navigateur refuse l'envoi tant qu'aucun choix du groupe n'est fait */
  required?: boolean
}

/**
 * Un choix parmi quelques-uns, dessiné comme une carte : toute la carte se
 * clique, celle qui est choisie prend le filet d'encre. À poser dans un
 * `fieldset` ; la disposition des cartes entre elles est à l'appelant.
 */
export default function ChoiceCard({
  children,
  note,
  checked,
  onChange,
  name,
  required,
}: ChoiceCardProps) {
  return (
    <label className={`${styles.card} ${note ? styles.withNote : ''}`}>
      <input
        type="radio"
        className={styles.radio}
        name={name}
        required={required}
        checked={checked}
        onChange={onChange}
      />
      <span>
        <span className={styles.label}>{children}</span>
        {note && <span className={styles.note}>{note}</span>}
      </span>
    </label>
  )
}
