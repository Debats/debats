import ShareStrip, { Share } from '../ShareStrip'
import styles from './ShareBar.module.css'

export type { Share }

interface ShareBarProps {
  /** Le nom de la ligne, à gauche de la barre */
  label: React.ReactNode
  /** De la plus à la moins soutenue : l'ordre donne la nuance d'encre */
  shares: Share[]
  /** L'effectif de la ligne, à droite de la barre, quand il veut dire quelque chose */
  value?: React.ReactNode
  /** La ligne de référence : détachée par un filet, en gras */
  reference?: boolean
}

/**
 * Une ligne de tableau autour d'une bande à 100 % : son nom à gauche, la part
 * de chaque position dans ce que la ligne compte, son effectif à droite.
 * Partagée par l'onglet Analyses d'un sujet et par la page « un auteur sur un
 * sujet ».
 *
 * Les parts arrivent calculées : ce qu'elles valent est une question de
 * domaine, et deux pages y répondaient déjà. La bande (`ShareStrip`) ne fait
 * que les dessiner.
 *
 * `value` reste facultatif parce que l'effectif n'est pas toujours lisible :
 * quand la barre compte des couples (auteur, position), un auteur qui a pris
 * deux positions pèse dans deux segments, et la somme n'est pas un nombre de
 * voix. Mieux vaut alors ne rien afficher qu'un total faux.
 */
export default function ShareBar({ label, shares, value, reference }: ShareBarProps) {
  return (
    <div className={rowClass(value !== undefined, reference)}>
      <span className={styles.label}>{label}</span>
      <ShareStrip shares={shares} percentages />
      {value !== undefined && <span className={styles.value}>{value}</span>}
    </div>
  )
}

/** La grille a une troisième colonne quand la ligne porte un effectif */
function rowClass(valued: boolean, reference?: boolean): string {
  const row = valued ? styles.rowValued : styles.row
  return reference ? `${row} ${styles.reference}` : row
}
