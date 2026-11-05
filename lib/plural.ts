/**
 * Accorde un libellé au nombre : « 0 sujet », « 1 sujet », « 3 sujets ». Le
 * nombre n'est pas inclus.
 *
 * Zéro prend le singulier : en français on écrit « 0 prise de position », pas
 * « 0 prises de position ». C'est la règle de l'usage, et pas celle de la
 * plupart des bibliothèques d'internationalisation, qui suivent l'anglais.
 */
export function plural(count: number, singular: string, pluralForm: string): string {
  return count <= 1 ? singular : pluralForm
}
