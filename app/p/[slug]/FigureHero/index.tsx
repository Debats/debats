import FigureAvatar from '../../../../components/figures/FigureAvatar'
import ComingSoon from '../../../../components/ui/ComingSoon'
import { ActivityPeriod } from '../../../../domain/services/figure-activity'
import { plural } from '../../../../lib/plural'
import styles from './FigureHero.module.css'

interface ExternalLink {
  href: string
  label: string
}

interface FigureCounts {
  statements: number
  subjects: number
  period: ActivityPeriod | null
}

interface FigureHeroProps {
  slug: string
  name: string
  presentation: string
  links: ExternalLink[]
  counts: FigureCounts
  /** Menu d'administration affiché à côté du nom, si l'utilisateur y a droit */
  adminMenu?: React.ReactNode
  /** Action principale et partage */
  actions: React.ReactNode
}

function periodLabel(period: ActivityPeriod | null): string {
  if (!period) return '–'
  return period.from === period.to ? String(period.from) : `${period.from} → ${period.to}`
}

export default function FigureHero({
  slug,
  name,
  presentation,
  links,
  counts,
  adminMenu,
  actions,
}: FigureHeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.kicker}>
          <span className={styles.label}>Personnalité</span>
          <ComingSoon>
            <span className={styles.tag}>Rôle</span>
          </ComingSoon>
          <ComingSoon>
            <span className={`${styles.tag} ${styles.tagOrg}`}>Organisation</span>
          </ComingSoon>
        </div>

        <div className={styles.grid}>
          <div className={styles.main}>
            <FigureAvatar slug={slug} name={name} size={96} />
            <div>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>{name}</h1>
                {adminMenu}
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
              <div className={styles.stat}>
                <dd className={styles.statValue}>{counts.statements}</dd>
                <dt className={styles.statLabel}>
                  {plural(counts.statements, 'prise de position', 'prises de position')}
                </dt>
              </div>
              <div className={styles.stat}>
                <dd className={styles.statValue}>{counts.subjects}</dd>
                <dt className={styles.statLabel}>{plural(counts.subjects, 'sujet', 'sujets')}</dt>
              </div>
              <div className={styles.stat}>
                <dd className={`${styles.statValue} ${styles.statPeriod}`}>
                  {periodLabel(counts.period)}
                </dd>
                <dt className={styles.statLabel}>période</dt>
              </div>
            </dl>
            <div className={styles.actions}>{actions}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
