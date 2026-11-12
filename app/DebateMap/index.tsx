import Link from 'next/link'
import { DebateMap as ThemedDebates } from '../../domain/read-models/home-debates'
import { themeHref } from '../../domain/read-models/hrefs'
import HomeSection from '../HomeSection'
import ThemeDebatesCard from './ThemeDebatesCard'
import styles from './DebateMap.module.css'

/**
 * La carte des débats : les thématiques qui portent le plus de sujets, chacune
 * avec ses sujets les plus discutés et la barre de leurs positions, puis les
 * autres thématiques nommées avec leur compte.
 */
export default function DebateMap({ map }: { map: ThemedDebates }) {
  if (map.themes.length === 0) return null

  return (
    <HomeSection
      title="La carte des débats"
      note="chaque barre montre comment les voix recensées se répartissent entre les positions"
    >
      <div className={styles.themes}>
        {map.themes.map((entry) => (
          <ThemeDebatesCard key={entry.theme.slug} entry={entry} />
        ))}
      </div>
      {map.others.length > 0 && (
        <p className={styles.others}>
          <span className={styles.othersLabel}>Et aussi</span>
          {map.others.map(({ theme, subjectsCount }) => (
            <Link key={theme.slug} href={themeHref(theme.slug)} className={styles.other}>
              {theme.name}
              <span className={styles.otherCount}>{subjectsCount}</span>
            </Link>
          ))}
        </p>
      )}
    </HomeSection>
  )
}
