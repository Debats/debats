import { percent } from '../../../lib/percent'
import { shadeOf } from '../shades'
import styles from './ShareStrip.module.css'

/** Un segment : son nom, son effectif, et sa part déjà calculée */
export interface Share {
  key: string
  label: string
  count: number
  /** Sa part du total, entre 0 et 1 : le domaine la calcule, pas la bande */
  share: number
}

interface ShareStripProps {
  /** De la plus à la moins soutenue : l'ordre donne la nuance d'encre */
  shares: Share[]
  /** Écrire le pourcentage dans les segments assez larges ; il faut alors la hauteur `tall` */
  percentages?: boolean
  size?: 'thin' | 'medium' | 'tall'
}

/** En dessous de cette part, le pourcentage ne tient pas dans le segment */
const READABLE = 0.12

/**
 * La bande à 100 % elle-même, sans rien autour : la part de chaque position,
 * de la plus à la moins soutenue. `ShareBar` la pose dans une ligne de
 * tableau ; une carte de sujet la pose nue sous son titre. Un sujet garde
 * ainsi les mêmes nuances partout où sa répartition apparaît.
 */
export default function ShareStrip({ shares, percentages, size = 'tall' }: ShareStripProps) {
  const description = shares.map((share) => `${share.label} : ${share.count}`).join(', ')

  return (
    <div className={`${styles.strip} ${styles[size]}`} role="img" aria-label={description}>
      {shares.map((share, index) => (
        <div
          key={share.key}
          className={`${styles.segment} ${shadeOf(index)}`}
          style={{ width: `${share.share * 100}%` }}
        >
          {percentages === true && share.share >= READABLE && percent(share.share)}
        </div>
      ))}
    </div>
  )
}
