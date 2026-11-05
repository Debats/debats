import styles from './StackedShareBar.module.css'

export interface Share {
  key: string
  label: string
  count: number
}

interface StackedShareBarProps {
  /** De la plus à la moins soutenue : l'ordre donne la nuance d'encre */
  shares: Share[]
  /** Le libellé de la ligne, à gauche de la barre */
  label: React.ReactNode
}

/*
 * Un auteur qui a pris deux positions pèse dans deux segments : le total de
 * la barre compte des couples (auteur, position), jamais des voix. Il n'est
 * donc pas affiché — le nombre de voix distinctes se dit ailleurs, en
 * toutes lettres, et `countSubjectVoices` est seul à le calculer.
 */

/** Nuance d'encre d'une part, de la plus à la moins soutenue */
export const shadeClass = (index: number) => styles[`shade${Math.min(index, 5)}`]

/** En dessous de cette part, le pourcentage ne tient pas dans le segment */
const READABLE = 0.12

/** Une barre à 100 % : la part de chaque position parmi les voix comptées. */
export default function StackedShareBar({ shares, label }: StackedShareBarProps) {
  const total = shares.reduce((sum, share) => sum + share.count, 0)
  const description = shares.map((share) => `${share.label} : ${share.count}`).join(', ')

  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <div className={styles.stack} role="img" aria-label={description}>
        {total > 0 &&
          shares.map((share, index) => {
            const part = share.count / total
            return (
              <div
                key={share.key}
                className={`${styles.segment} ${shadeClass(index)}`}
                style={{ width: `${part * 100}%` }}
              >
                {part >= READABLE && `${Math.round(part * 100)} %`}
              </div>
            )
          })}
      </div>
    </div>
  )
}
