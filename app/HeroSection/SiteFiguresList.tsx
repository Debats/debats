import { SiteFigures } from '../../domain/read-models/home-debates'
import { plural } from '../../lib/plural'
import styles from './HeroSection.module.css'

/** Ce que le site contient, compté : six nombres sous la recherche. */
export default function SiteFiguresList({ figures }: { figures: SiteFigures }) {
  const counted: Array<[number, string]> = [
    [figures.subjects, plural(figures.subjects, 'sujet', 'sujets')],
    [figures.positions, plural(figures.positions, 'position', 'positions')],
    [figures.statements, plural(figures.statements, 'prise de position', 'prises de position')],
    [figures.publicFigures, plural(figures.publicFigures, 'personnalité', 'personnalités')],
    [figures.organisations, plural(figures.organisations, 'organisation', 'organisations')],
    [figures.sources, plural(figures.sources, 'source citée', 'sources citées')],
  ]

  return (
    <dl className={styles.figures}>
      {counted.map(([count, label]) => (
        <div key={label} className={styles.figure}>
          <dt className={styles.figureLabel}>{label}</dt>
          <dd className={styles.figureNumber}>{count.toLocaleString('fr-FR')}</dd>
        </div>
      ))}
    </dl>
  )
}
