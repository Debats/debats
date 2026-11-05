/**
 * L'élision d'une préposition devant un nom propre : « de Alma » n'existe
 * pas, « d'Alma » si.
 *
 * Le h n'élide pas ici : il faudrait savoir s'il est muet (« d'Hélène ») ou
 * aspiré (« de Hollande »), et le site ne le sait pas. « de Hélène » est
 * maladroit, « d'Hollande » serait faux : on garde la forme non élidée.
 */
const VOWELS = /^[aeiouyàâäéèêëîïôöùûü]/i

/**
 * La préposition et le nom : « d'Alma Dufour », « de Fabien Roussel ». C'est
 * ce que veulent les phrases écrites d'un bloc — une description de page, un
 * libellé.
 */
export const elided = (preposition: string, word: string): string =>
  `${prepositionBefore(preposition, word)}${word}`

/**
 * La préposition seule, élidée ou non : « d' » ou « de ». Pour les phrases
 * en JSX, où le nom est mis en gras juste après et ne peut donc pas passer
 * dans la même chaîne — l'appelant écrit alors
 * `{prepositionBefore('de', nom)}<strong>{nom}</strong>`.
 */
export function prepositionBefore(preposition: string, word: string): string {
  if (!VOWELS.test(word)) return `${preposition} `
  return `${preposition.slice(0, -1)}’`
}
