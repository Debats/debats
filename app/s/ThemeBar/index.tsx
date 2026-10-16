import { ThemeSection } from '../../../domain/read-models/subject-index'
import { themeSectionAnchor, themeSectionName } from '../theme-section-anchor'
import styles from './ThemeBar.module.css'

interface ThemeBarProps {
  sections: ThemeSection[]
}

/** Barre des thématiques, collée sous l'en-tête : une pilule par section de l'index. */
export default function ThemeBar({ sections }: ThemeBarProps) {
  return (
    <nav className={styles.bar} aria-label="Thématiques">
      <div className={styles.scroller}>
        {sections.map((section) => (
          <a
            key={themeSectionAnchor(section)}
            href={`#${themeSectionAnchor(section)}`}
            className={styles.pill}
          >
            {themeSectionName(section)}
            <span className={styles.count}>{section.subjectsCount}</span>
          </a>
        ))}
      </div>
    </nav>
  )
}
