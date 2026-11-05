import { shadeOf } from '../../../styles/shades'
import styles from './ShareBar.module.css'

/** Une part de la barre : ce qu'on compte, et sous quel nom */
export interface Share {
  key: string
  label: string
  count: number
}

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

/** En dessous de cette part, le pourcentage ne tient pas dans le segment */
const READABLE = 0.12

/**
 * Une barre à 100 % : la part de chaque position parmi ce que la ligne
 * compte. Partagée par l'onglet Analyses d'un sujet et par la page « un
 * auteur sur un sujet », pour qu'un sujet garde les mêmes nuances d'une
 * page à l'autre.
 *
 * `value` reste facultatif parce que l'effectif n'est pas toujours lisible :
 * quand la barre compte des couples (auteur, position), un auteur qui a pris
 * deux positions pèse dans deux segments, et la somme n'est pas un nombre de
 * voix. Mieux vaut alors ne rien afficher que de montrer un total faux.
 */
export default function ShareBar({ label, shares, value, reference }: ShareBarProps) {
  const total = shares.reduce((sum, share) => sum + share.count, 0)
  const description = shares.map((share) => `${share.label} : ${share.count}`).join(', ')

  return (
    <div className={rowClass(value !== undefined, reference)}>
      <span className={styles.label}>{label}</span>
      <div className={styles.stack} role="img" aria-label={description}>
        {total > 0 &&
          shares.map((share, index) => {
            const part = share.count / total
            return (
              <div
                key={share.key}
                className={`${styles.segment} ${shadeOf(index)}`}
                style={{ width: `${part * 100}%` }}
              >
                {part >= READABLE && `${Math.round(part * 100)} %`}
              </div>
            )
          })}
      </div>
      {value !== undefined && <span className={styles.value}>{value}</span>}
    </div>
  )
}

/** La grille a une troisième colonne quand la ligne porte un effectif */
function rowClass(valued: boolean, reference?: boolean): string {
  const row = valued ? styles.rowValued : styles.row
  return reference ? `${row} ${styles.reference}` : row
}
