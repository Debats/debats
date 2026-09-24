import Link from 'next/link'
import FigureAvatar from '../../../../../../components/figures/FigureAvatar'
import { plural } from '../../../../../../lib/plural'
import styles from './FigureSubjectHero.module.css'

interface FigureSubjectHeroProps {
  figure: { name: string; slug: string }
  subject: { title: string; slug: string }
  counts: {
    statements: number
    positions: number
    allies: number
  }
  /** Partage et autres actions */
  actions: React.ReactNode
}

/** En-tête de la page « une personnalité sur un sujet ». */
export default function FigureSubjectHero({
  figure,
  subject,
  counts,
  actions,
}: FigureSubjectHeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <nav className={styles.kicker} aria-label="Fil d’Ariane">
          <Link href={`/p/${figure.slug}`} className={styles.crumb}>
            Personnalité
          </Link>
          <span className={styles.crumbSeparator}>/</span>
          <Link href={`/s/${subject.slug}`} className={styles.crumb}>
            Sujet
          </Link>
        </nav>

        <div className={styles.grid}>
          <div className={styles.main}>
            <FigureAvatar slug={figure.slug} name={figure.name} size={96} />
            <div>
              <h1 className={styles.title}>
                <Link href={`/p/${figure.slug}`} className={styles.figureLink}>
                  {figure.name}
                </Link>
              </h1>
              <p className={styles.subject}>
                sur{' '}
                <Link href={`/s/${subject.slug}`} className={styles.subjectLink}>
                  {subject.title}
                </Link>
              </p>
            </div>
          </div>

          <div className={styles.aside}>
            <dl className={styles.stats}>
              <div className={styles.stat}>
                <dd className={styles.statValue}>{counts.statements}</dd>
                <dt className={styles.statLabel}>
                  {plural(counts.statements, 'prise de position', 'prises de position')}
                </dt>
              </div>
              <div className={styles.stat}>
                <dd className={styles.statValue}>{counts.positions}</dd>
                <dt className={styles.statLabel}>
                  {plural(counts.positions, 'position défendue', 'positions défendues')}
                </dt>
              </div>
              <div className={styles.stat}>
                <dd className={styles.statValue}>{counts.allies}</dd>
                <dt className={styles.statLabel}>
                  {plural(counts.allies, 'personnalité du même avis', 'personnalités du même avis')}
                </dt>
              </div>
            </dl>
            <div className={styles.actions}>{actions}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
