import { shadeOf } from '../shades'
import styles from './ShareLegend.module.css'

/** Une entrée de légende : sa nuance vient de son rang dans la liste */
export interface LegendItem {
  key: string
  label: string
  /** Ce qu'on ajoute à droite du nom : une part, « sa position »… */
  note?: React.ReactNode
}

/**
 * Les nuances d'une barre à 100 %, nommées. L'ordre des entrées est celui
 * de la barre : c'est lui qui donne la nuance, ici comme là-bas.
 */
export default function ShareLegend({
  items,
  label = 'Positions',
}: {
  items: LegendItem[]
  /** Ce que la légende énumère, pour les lecteurs d'écran */
  label?: string
}) {
  return (
    <ul className={styles.legend} aria-label={label}>
      {items.map((item, index) => (
        <li key={item.key} className={styles.item}>
          <span aria-hidden="true" className={`${styles.swatch} ${shadeOf(index)}`} />
          {item.label}
          {item.note !== undefined && <span className={styles.note}>{item.note}</span>}
        </li>
      ))}
    </ul>
  )
}
