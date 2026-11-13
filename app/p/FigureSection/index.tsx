import { FigureIndexSection } from '../../../domain/read-models/figure-index'
import { figureSectionAnchor, figureSectionName } from '../figure-section'
import FigureCard from './FigureCard'
import SectionAside from './SectionAside'
import styles from './FigureSection.module.css'

interface FigureSectionProps {
  section: FigureIndexSection
}

/** Le rôle montré sous un nom ; sans métier connu, la carte le dit */
const roleIn = (section: FigureIndexSection, role: string): string =>
  section.kind === 'unassigned'
    ? ['Aucun métier renseigné', role].filter(Boolean).join(' · ')
    : role

/** Un bloc de l'index : une famille de métiers, les petites familles réunies, ou les sans-métier. */
export default function FigureSection({ section }: FigureSectionProps) {
  return (
    <section id={figureSectionAnchor(section)} className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.title}>{figureSectionName(section)}</h2>
        <SectionAside section={section} />
      </div>

      <div className={styles.grid}>
        {section.figures.map((figure) => (
          <FigureCard
            key={figure.id}
            figure={figure}
            role={roleIn(section, figure.role)}
            missing={section.kind === 'unassigned'}
          />
        ))}
      </div>
    </section>
  )
}
