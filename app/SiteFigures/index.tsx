import { SiteFigures as Figures } from '../../domain/read-models/home-debates'
import { plural } from '../../lib/plural'
import styles from './SiteFigures.module.css'

/**
 * Ce que le site contient, compté : six nombres au pied de l'accueil. Ils
 * disent l'étendue du site à qui a lu la page, sans passer avant ce qu'elle
 * donne à lire.
 */
export default function SiteFigures({ figures }: { figures: Figures }) {
  const counted: Array<[number, string]> = [
    [figures.subjects, plural(figures.subjects, 'sujet', 'sujets')],
    [figures.positions, plural(figures.positions, 'position', 'positions')],
    [figures.statements, plural(figures.statements, 'prise de position', 'prises de position')],
    [figures.publicFigures, plural(figures.publicFigures, 'personnalité', 'personnalités')],
    [figures.organisations, plural(figures.organisations, 'organisation', 'organisations')],
    [figures.sources, plural(figures.sources, 'source citée', 'sources citées')],
  ]

  return (
    <section className={styles.band} aria-label="Le site en chiffres">
      <dl className={styles.figures}>
        {counted.map(([count, label]) => (
          <div key={label} className={styles.figure}>
            <dt className={styles.label}>{label}</dt>
            <dd className={styles.number}>{count.toLocaleString('fr-FR')}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
