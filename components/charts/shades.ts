import analysis from '../../styles/analysis.module.css'

/** Le nombre de nuances d'encre que la palette distingue */
const SHADES = 6

/**
 * La nuance d'encre d'une part, de la plus à la moins soutenue : au-delà de
 * la sixième tout se confondrait, alors la dernière sert pour le reste. Les
 * nuances elles-mêmes sont dans `styles/analysis.module.css`, pour qu'un
 * sujet garde les mêmes d'une page à l'autre ; la règle qui les choisit vit
 * ici, avec les graphiques qui s'en servent.
 */
export const shadeOf = (index: number) => analysis[`shade${Math.min(index, SHADES - 1)}`]
