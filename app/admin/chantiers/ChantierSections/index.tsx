import { ChantierSection } from '../../../../domain/read-models/chantier-sections'
import DraftList from '../../drafts/DraftList'
import styles from './ChantierSections.module.css'

interface ChantierSectionsProps {
  sections: ChantierSection[]
}

/** The pending drafts of a chantier, under the sections the agent gave them, or the site's by default */
export default function ChantierSections({ sections }: ChantierSectionsProps) {
  return (
    <div className={styles.sections}>
      {sections.map((section) => (
        <section key={section.title} className={styles.section} aria-label={section.title}>
          <h2 className={styles.heading}>
            {section.title}
            <span className={styles.count}>{section.items.length}</span>
          </h2>
          <DraftList drafts={section.items} view={{ grouping: 'subject' }} />
        </section>
      ))}
    </div>
  )
}
