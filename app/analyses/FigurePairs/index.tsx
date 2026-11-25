import RuledSection from '../../../components/layout/RuledSection'
import { FigureAgreement } from '../../../domain/read-models/figure-agreements'
import { OpposedPair } from '../../../domain/services/site-analyses'
import FigurePairCard from './FigurePairCard'
import styles from './FigurePairs.module.css'

interface FigurePairsProps {
  /** Les paires qui s'accordent sur le plus de sujets */
  agreeing: FigureAgreement[]
  /** Les paires qui s'opposent sur le plus de sujets */
  opposed: OpposedPair[]
}

/**
 * Qui pense comme qui, qui pense autrement : des paires de personnalités et
 * le nombre de sujets sur lesquels elles s'accordent, ou s'opposent, parmi
 * ceux où toutes deux se sont exprimées. Les paires sont choisies par une
 * règle, la même pour toutes : le site ne décide pas lesquelles méritent
 * d'être montrées.
 */
export default function FigurePairs({ agreeing, opposed }: FigurePairsProps) {
  if (agreeing.length === 0 && opposed.length === 0) return null

  return (
    <RuledSection nested title="Qui pense comme qui, qui pense autrement">
      {agreeing.length > 0 && (
        <div className={styles.group}>
          <h4 className={styles.groupLabel}>Le plus souvent d’accord</h4>
          <ul className={styles.cards}>
            {agreeing.map((pair) => (
              <FigurePairCard
                key={`${pair.a.id}-${pair.b.id}`}
                a={pair.a}
                b={pair.b}
                count={pair.agreedSubjects}
                unit={['sujet en accord', 'sujets en accord']}
                commonSubjects={pair.commonSubjects}
                examples={pair.examples}
              />
            ))}
          </ul>
        </div>
      )}
      {opposed.length > 0 && (
        <div className={styles.group}>
          <h4 className={styles.groupLabel}>Le plus souvent opposé·es</h4>
          <ul className={styles.cards}>
            {opposed.map((pair) => (
              <FigurePairCard
                key={`${pair.a.id}-${pair.b.id}`}
                a={pair.a}
                b={pair.b}
                count={pair.opposedSubjects}
                unit={['sujet en désaccord', 'sujets en désaccord']}
                commonSubjects={pair.commonSubjects}
                examples={pair.examples}
              />
            ))}
          </ul>
        </div>
      )}
    </RuledSection>
  )
}
