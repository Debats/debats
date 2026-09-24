import Image from 'next/image'
import Link from 'next/link'
import ThemeBadge from '../../../../components/ui/ThemeBadge'
import { formatDate } from '../../../../lib/format-date'
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
  positions: number
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
  /** Boutons d'action (ajouter, partager…) */
  actions: React.ReactNode
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
  overview,
}: SubjectHeroProps) {
  const stats = [
    { value: counts.positions, label: plural(counts.positions, 'position', 'positions') },
    {
      value: counts.publicFigures,
      label: plural(counts.publicFigures, 'personnalité', 'personnalités'),
    },
    {
      value: counts.statements,
      label: plural(counts.statements, 'prise de position', 'prises de position'),
    },
  ]

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
                {stats.map((stat) => (
                  <div key={stat.label} className={styles.stat}>
                    <dd className={styles.statValue}>{stat.value}</dd>
                    <dt className={styles.statLabel}>{stat.label}</dt>
                  </div>
                ))}
              </dl>
              <p className={styles.updated}>Mis à jour le {formatDate(updatedAt)}</p>
            </div>
            <div className={styles.actions}>{actions}</div>
          </div>
        </div>

        {overview}
      </div>
    </section>
  )
}
