import Link from 'next/link'
import EntityReview from '../../../../../../components/review/EntityReview'
import { subjectHref } from '../../../../../../domain/read-models/hrefs'
import { plural } from '../../../../../../lib/plural'
import styles from './PositionHero.module.css'

interface PositionHeroProps {
  id: string
  subject: { title: string; slug: string }
  title: string
  description: string
  counts: {
    statements: number
    figures: number
    organisations: number
  }
  /** Menu d'administration affiché à côté du titre, si l'utilisateur y a droit */
  adminMenu?: React.ReactNode
  /** Action principale et partage */
  actions: React.ReactNode
}

/** En-tête de la page d'une position : une réponse possible à la problématique d'un sujet. */
export default function PositionHero({
  id,
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
        <div className={styles.kicker}>
          <nav className={styles.crumbs} aria-label="Fil d’Ariane">
            <Link href={subjectHref(subject.slug)} className={styles.crumb}>
              {subject.title}
            </Link>
            <span className={styles.crumbSeparator}>/</span>
            <span className={styles.crumbCurrent}>Position</span>
          </nav>
          <EntityReview entity={{ type: 'position', id }} />
        </div>

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
              <div className={styles.stat}>
                <dd className={styles.statValue}>{counts.organisations}</dd>
                <dt className={styles.statLabel}>
                  {plural(counts.organisations, 'organisation', 'organisations')}
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
