import Link from 'next/link'
import { ThemeSection as ThemeSectionModel } from '../../../domain/read-models/subject-index'
import { plural } from '../../../lib/plural'
import CompactSubjectCard from '../CompactSubjectCard'
import FeaturedSubjectCard from '../FeaturedSubjectCard'
import { themeSectionAnchor, themeSectionName } from '../theme-section-anchor'
import styles from './ThemeSection.module.css'

interface ThemeSectionProps {
  section: ThemeSectionModel
}

/** Une thématique de l'index : son sujet le plus documenté, puis tous les autres. */
export default function ThemeSection({ section }: ThemeSectionProps) {
  const { theme, featured, others, subjectsCount } = section
  const themeHref = theme ? `/themes/${theme.slug}` : '/themes/autres'
  const countLabel = `${subjectsCount} ${plural(subjectsCount, 'sujet', 'sujets')}`

  return (
    <section id={themeSectionAnchor(section)} className={styles.section}>
      <div className={styles.head}>
        <div className={styles.naming}>
          <h2 className={styles.title}>
            <Link href={themeHref} className={styles.titleLink}>
              {themeSectionName(section)}
            </Link>
          </h2>
          <p className={styles.description}>
            {theme ? theme.description : 'Sujets sans thématique principale'}
          </p>
        </div>
        <Link href={themeHref} className={styles.count}>
          {countLabel}
        </Link>
      </div>

      <FeaturedSubjectCard
        subject={featured}
        kicker={others.length > 0 ? 'Le plus documenté' : undefined}
      />

      {others.length > 0 && (
        <div className={styles.grid}>
          {others.map((subject) => (
            <CompactSubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      )}
    </section>
  )
}
