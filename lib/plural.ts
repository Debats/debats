/** Accorde un libellé au nombre : « 1 sujet », « 3 sujets ». Le nombre n'est pas inclus. */
export function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm
}
