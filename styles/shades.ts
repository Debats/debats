import analysis from './analysis.module.css'

/** Le nombre de nuances d'encre que la palette distingue */
export const SHADES = 6

/**
 * La nuance d'encre d'une part, de la plus à la moins soutenue. Les nuances
 * sont dans `analysis.module.css` et la règle qui les choisit vit ici, à
 * côté d'elles : au-delà de la sixième, tout se confondrait, alors la
 * dernière sert pour le reste.
 */
export const shadeOf = (index: number) => analysis[`shade${Math.min(index, SHADES - 1)}`]
