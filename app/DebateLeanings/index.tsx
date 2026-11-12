import { DebateLeanings as Leanings } from '../../domain/read-models/home-debates'
import DebateRow from '../DebateRow'
import HomeSection from '../HomeSection'
import { leaningNote } from './leaning-note'
import styles from './DebateLeanings.module.css'

/**
 * Où les voix se partagent, où elles penchent : deux colonnes de sujets, ceux
 * où plusieurs positions se disputent les voix et ceux où une position en
 * réunit l'essentiel. Le site compte les voix qu'il a recensées, et le dit :
 * ce n'est pas l'opinion du pays.
 */
export default function DebateLeanings({ leanings }: { leanings: Leanings }) {
  const columns = [
    { label: 'Les plus partagés', debates: leanings.split },
    { label: 'Les plus tranchés', debates: leanings.settled },
  ].filter((column) => column.debates.length > 0)
  if (columns.length === 0) return null

  return (
    <HomeSection
      title="Où les voix se partagent, où elles penchent"
      note="parmi les voix que le site a recensées — ce n’est pas un sondage"
    >
      <div className={styles.columns}>
        {columns.map((column) => (
          <div key={column.label} className={styles.column}>
            <h3 className={styles.columnLabel}>{column.label}</h3>
            <ul className={styles.rows}>
              {column.debates.map((debate) => (
                <DebateRow key={debate.id} debate={debate} note={leaningNote(debate)} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </HomeSection>
  )
}
