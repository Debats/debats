import styles from './SubjectAnalyses.module.css'

export const percent = (share: number) => `${Math.round(share * 100)} %`

export const signed = (deviation: number) => {
  const points = Math.round(deviation * 100)
  return points > 0 ? `+${points}` : String(points)
}

/** Nuance d'encre d'une position, de la plus à la moins soutenue */
export const shadeClass = (index: number) => styles[`shade${Math.min(index, 5)}`]
