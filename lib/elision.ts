/**
 * L'élision d'une préposition devant un nom propre : « de Alma » n'existe
 * pas, « d'Alma » si.
 *
 * Le h n'élide pas ici : il faudrait savoir s'il est muet (« d'Hélène ») ou
 * aspiré (« de Hollande »), et le site ne le sait pas. « de Hélène » est
 * maladroit, « d'Hollande » serait faux : on garde la forme non élidée.
 */
const VOWELS = /^[aeiouyàâäéèêëîïôöùûü]/i

export function elide(preposition: string, word: string): string {
  if (!VOWELS.test(word)) return `${preposition} `
  return `${preposition.slice(0, -1)}’`
}
