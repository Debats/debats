import Link from 'next/link'
import { plural } from '../../../../../../lib/plural'
import styles from './PositionHero.module.css'

interface PositionHeroProps {
  subject: { title: string; slug: string }
  title: string
  description: string
  counts: {
    statements: number
    figures: number
  }
  /** Menu d'administration affiché à côté du titre, si l'utilisateur y a droit */
  adminMenu?: React.ReactNode
  /** Action principale et partage */
  actions: React.ReactNode
}

/** En-tête de la page d'une position : une réponse possible à la problématique d'un sujet. */
export default function PositionHero({
  subject,
  title,
  description,
  counts,
  adminMenu,
  actions,
}: PositionHeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <nav className={styles.kicker} aria-label="Fil d’Ariane">
          <Link href={`/s/${subject.slug}`} className={styles.crumb}>
            {subject.title}
          </Link>
          <span className={styles.crumbSeparator}>/</span>
          <span className={styles.crumbCurrent}>Position</span>
        </nav>

        <div className={styles.grid}>
          <div className={styles.main}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{title}</h1>
              {adminMenu}
            </div>
            <p className={styles.description}>{description}</p>
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
                <dd className={styles.statValue}>{counts.figures}</dd>
                <dt className={styles.statLabel}>
                  {plural(counts.figures, 'personnalité', 'personnalités')}
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
