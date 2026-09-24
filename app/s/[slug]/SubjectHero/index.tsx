import Image from 'next/image'
import Link from 'next/link'
import ComingSoon from '../../../../components/ui/ComingSoon'
import ThemeBadge from '../../../../components/ui/ThemeBadge'
import { formatShortDate } from '../../../../lib/format-date'
import styles from './SubjectHero.module.css'

interface ThemeLink {
  id: string
  name: string
  slug: string
}

interface SubjectLink {
  id: string
  title: string
  slug: string
}

interface SubjectCounts {
  publicFigures: number
  statements: number
}

interface SubjectHeroProps {
  title: string
  problem: string
  presentation: string
  updatedAt: Date
  themes: ThemeLink[]
  relatedSubjects: SubjectLink[]
  counts: SubjectCounts
  /** Menu d'administration affiché à côté du titre, si l'utilisateur y a droit */
  adminMenu?: React.ReactNode
  /** Action principale et partage */
  actions: React.ReactNode
  /** Action discrète sous les boutons (proposer une position…) */
  secondaryAction?: React.ReactNode
  /** Vue d'ensemble affichée sous la présentation (les positions du sujet) */
  overview?: React.ReactNode
}

/** Bannière par défaut tant que les sujets n'ont pas d'image propre */
const DEFAULT_BANNER = '/images/subject-default.jpg'

function plural(count: number, singular: string, pluralForm: string) {
  return count === 1 ? singular : pluralForm
}

export default function SubjectHero({
  title,
  problem,
  presentation,
  updatedAt,
  themes,
  relatedSubjects,
  counts,
  adminMenu,
  actions,
  secondaryAction,
  overview,
}: SubjectHeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.banner}>
        <Image src={DEFAULT_BANNER} alt="" fill sizes="100vw" priority className={styles.photo} />
      </div>

      <div className={styles.container}>
        <div className={styles.kicker}>
          <span className={styles.label}>Sujet</span>
          {themes.map((theme) => (
            <ThemeBadge key={theme.id} name={theme.name} slug={theme.slug} />
          ))}
        </div>

        <div className={styles.grid}>
          <div className={styles.main}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{title}</h1>
              {adminMenu}
            </div>
            <p className={styles.problem}>{problem}</p>
            <p className={styles.presentation}>{presentation}</p>
            {relatedSubjects.length > 0 && (
              <p className={styles.related}>
                <span className={styles.label}>Voir aussi</span>
                {relatedSubjects.map((subject, index) => (
                  <span key={subject.id}>
                    {index > 0 && <span className={styles.relatedSeparator}>·</span>}
                    <Link href={`/s/${subject.slug}`} className={styles.relatedLink}>
                      {subject.title}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>

          <div className={styles.aside}>
            <div className={styles.statsCard}>
              <dl className={styles.stats}>
                <div className={styles.stat}>
                  <dd className={styles.statValue}>{counts.statements}</dd>
                  <dt className={styles.statLabel}>
                    {plural(counts.statements, 'prise de position', 'prises de position')}
                  </dt>
                </div>
                <div className={styles.stat}>
                  <dd className={styles.statValue}>{counts.publicFigures}</dd>
                  <dt className={styles.statLabel}>
                    {plural(counts.publicFigures, 'personnalité', 'personnalités')}
                  </dt>
                </div>
                <ComingSoon as="div" className={styles.stat}>
                  <dd className={`${styles.statValue} ${styles.statValueOrg}`}>–</dd>
                  <dt className={styles.statLabel}>organisations</dt>
                </ComingSoon>
              </dl>
              <p className={styles.updated}>Mis à jour le {formatShortDate(updatedAt)}</p>
            </div>
            <div className={styles.actions}>{actions}</div>
            {secondaryAction && <div className={styles.secondaryAction}>{secondaryAction}</div>}
          </div>
        </div>

        {overview}
      </div>
    </section>
  )
}
