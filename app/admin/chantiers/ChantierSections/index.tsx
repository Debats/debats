import { ChantierSection } from '../../../../domain/read-models/chantier-sections'
import { JointDeclarationDraft } from '../../../../domain/read-models/joint-declaration-draft'
import DraftList from '../../drafts/DraftList'
import DraftedDeclarationCard from '../DraftedDeclarationCard'
import styles from './ChantierSections.module.css'

interface ChantierSectionsProps {
  /** The joint declarations the pending drafts draw, each read as one text */
  declarations: JointDeclarationDraft[]
  /** The drafts that sign nothing, under their sections */
  sections: ChantierSection[]
}

const DECLARATIONS_TITLE = 'Déclarations communes'

/**
 * The pending drafts of a chantier. The joint declarations come first, each
 * as one text with its positions and its signatories, wherever the agent
 * ranged their drafts; then the other drafts, under the sections the agent
 * gave them, or the site's by default.
 */
export default function ChantierSections({ declarations, sections }: ChantierSectionsProps) {
  return (
    <div className={styles.sections}>
      {declarations.length > 0 && (
        <section className={styles.section} aria-label={DECLARATIONS_TITLE}>
          <h2 className={styles.heading}>
            {DECLARATIONS_TITLE}
            <span className={styles.count}>{declarations.length}</span>
          </h2>
          {declarations.map((declaration) => (
            <DraftedDeclarationCard key={declaration.sourceUrl} declaration={declaration}>
              <DraftList drafts={declaration.items} view={{ grouping: 'subject' }} />
            </DraftedDeclarationCard>
          ))}
        </section>
      )}
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
