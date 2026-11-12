import { ReactNode } from 'react'
import { ReviewedEntity } from '../../../domain/aggregates/review'
import EntityReview from '../../review/EntityReview'
import ComingSoon from '../../ui/ComingSoon'
import styles from './DetailHero.module.css'

export interface ExternalLink {
  href: string
  label: string
}

export interface HeroStat {
  value: ReactNode
  label: string
  /** Valeur textuelle plutôt qu'un nombre : affichée plus petite */
  compact?: boolean
  /** La statistique est annoncée mais pas encore calculée */
  soon?: boolean
}

interface DetailHeroProps {
  /** Libellé et pastilles au-dessus du titre */
  kicker: ReactNode
  /** L'entité que la page présente : sa marque de vérification ferme la ligne du libellé */
  reviewed: ReviewedEntity
  /** Avatar ou logo à gauche du titre ; absent pour une notion sans visuel (argument) */
  media?: ReactNode
  title: string
  /** Complément affiché à côté du titre (sigle, menu d'administration…) */
  titleAside?: ReactNode
  presentation: ReactNode
  links?: ExternalLink[]
  stats: HeroStat[]
  /** Action principale et partage */
  actions: ReactNode
}

/** Bandeau d'en-tête d'une page de détail (personnalité, organisation). */
export default function DetailHero({
  kicker,
  reviewed,
  media,
  title,
  titleAside,
  presentation,
  links = [],
  stats,
  actions,
}: DetailHeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.kicker}>
          {kicker}
          <EntityReview entity={reviewed} />
        </div>

        <div className={styles.grid}>
          <div className={styles.main}>
            {media}
            <div>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>{title}</h1>
                {titleAside}
              </div>
              <p className={styles.presentation}>{presentation}</p>
              {links.length > 0 && (
                <div className={styles.links}>
                  {links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.link}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.aside}>
            <dl className={styles.stats}>
              {stats.map((stat) => {
                const content = (
                  <>
                    <dd className={stat.compact ? styles.statCompact : styles.statValue}>
                      {stat.value}
                    </dd>
                    <dt className={styles.statLabel}>{stat.label}</dt>
                  </>
                )
                return stat.soon ? (
                  <ComingSoon key={stat.label} as="div" className={styles.stat}>
                    {content}
                  </ComingSoon>
                ) : (
                  <div key={stat.label} className={styles.stat}>
                    {content}
                  </div>
                )
              })}
            </dl>
            <div className={styles.actions}>{actions}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
