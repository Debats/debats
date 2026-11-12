import { FigureAgreement } from '../../domain/read-models/figure-agreements'
import HomeSection from '../HomeSection'
import FigurePairCard from './FigurePairCard'
import styles from './FigurePairs.module.css'

/**
 * Qui pense comme qui ? Des paires de personnalités et le nombre de sujets sur
 * lesquels elles s'accordent, parmi ceux où toutes deux se sont exprimées. Les
 * paires sont choisies par une règle, la même pour toutes : le site ne décide
 * pas lesquelles méritent d'être montrées.
 */
export default function FigurePairs({ pairs }: { pairs: FigureAgreement[] }) {
  if (pairs.length === 0) return null

  return (
    <HomeSection
      title="Qui pense comme qui ?"
      note="même avis : au moins une position partagée sur le sujet"
    >
      <ul className={styles.cards}>
        {pairs.map((pair) => (
          <FigurePairCard key={`${pair.a.id}-${pair.b.id}`} pair={pair} />
        ))}
      </ul>
    </HomeSection>
  )
}
