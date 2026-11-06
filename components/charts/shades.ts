import analysis from '../../styles/analysis.module.css'

/**
 * Le nombre de nuances d'encre que la palette distingue. Exporté pour que
 * `shades.test.ts` le confronte à `styles/analysis.module.css` : une nuance
 * retirée de la feuille sans toucher à ce nombre donnerait une classe
 * absente, et un segment transparent.
 */
export const SHADES = 6

/**
 * La nuance d'encre d'une part, de la plus à la moins soutenue : au-delà de
 * la sixième tout se confondrait, alors la dernière sert pour le reste. Les
 * nuances elles-mêmes sont dans `styles/analysis.module.css`, pour qu'un
 * sujet garde les mêmes d'une page à l'autre ; la règle qui les choisit vit
 * ici, avec les graphiques qui s'en servent.
 *
 * Le débordement par le haut est un choix de palette ; un rang négatif est
 * une erreur d'appelant, et se tait d'autant moins qu'il donnerait la
 * nuance de la position la plus soutenue.
 */
export function shadeOf(index: number): string {
  if (index < 0) throw new Error(`Rang de nuance négatif : ${index}`)

  const name = `shade${Math.min(index, SHADES - 1)}`
  const shade = analysis[name]
  // Sans ce garde-fou, une nuance absente de la feuille rendrait `undefined`
  // dans un `className` : pas d'erreur, un segment invisible.
  if (!shade) throw new Error(`Nuance ${name} absente de styles/analysis.module.css`)
  return shade
}
