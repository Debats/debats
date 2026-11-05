import { percent, signed } from '../../../../lib/percent'
import styles from './SubjectAnalyses.module.css'

export { percent, signed }

/** Nuance d'encre d'une position, de la plus à la moins soutenue */
export const shadeClass = (index: number) => styles[`shade${Math.min(index, 5)}`]
