import { plural } from './plural'

/** « 8 prises de position · 8 personnalités », tel qu'affiché sous un sujet */
export function subjectCountsLabel(subject: {
  statementsCount: number
  publicFiguresCount: number
}): string {
  const statements = `${subject.statementsCount} ${plural(subject.statementsCount, 'prise de position', 'prises de position')}`
  const figures = `${subject.publicFiguresCount} ${plural(subject.publicFiguresCount, 'personnalité', 'personnalités')}`
  return `${statements} · ${figures}`
}
