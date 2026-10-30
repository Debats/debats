import CompanionRow from './CompanionRow'
import { Companion } from '../../../domain/services/author-analyses'
import styles from './AuthorAnalyses.module.css'

interface CompanionsColumnProps {
  title: string
  companions: Companion[]
  /** The column lists those who stand apart, instead of together */
  apart: boolean
}

/** Une colonne de la carte « Qui pense comme elle » : un titre et ses auteur·es. */
export default function CompanionsColumn({ title, companions, apart }: CompanionsColumnProps) {
  return (
    <div>
      <h4 className={styles.columnTitle}>{title}</h4>
      {companions.length === 0 ? (
        <p className={styles.empty}>Personne, pour l’instant.</p>
      ) : (
        <ul className={styles.companions}>
          {companions.map((c) => (
            <CompanionRow key={`${c.author.kind}-${c.author.id}`} companion={c} apart={apart} />
          ))}
        </ul>
      )}
    </div>
  )
}
