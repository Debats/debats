import Link from 'next/link'
import ThemeBadge from '../../../../components/ui/ThemeBadge'
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
  themes: ThemeLink[]
  relatedSubjects: SubjectLink[]
  counts: SubjectCounts
  /** Menu d'administration affiché à côté du titre, si l'utilisateur y a droit */
  adminMenu?: React.ReactNode
  /** Boutons d'action (ajouter, partager…) */
  actions: React.ReactNode
}

function plural(count: number, singular: string, pluralForm: string) {
  return count === 1 ? singular : pluralForm
}

export default function SubjectHero({
  title,
  problem,
  presentation,
  themes,
  relatedSubjects,
  counts,
  adminMenu,
  actions,
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
            <dl className={styles.stats}>
              {stats.map((stat) => (
                <div key={stat.label} className={styles.stat}>
                  <dd className={styles.statValue}>{stat.value}</dd>
                  <dt className={styles.statLabel}>{stat.label}</dt>
                </div>
              ))}
            </dl>
            <div className={styles.actions}>{actions}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
