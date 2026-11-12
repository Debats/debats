import { MovingDebate } from '../../domain/read-models/home-page'
import HomeSection from '../HomeSection'
import MovingDebateCard from './MovingDebateCard'
import styles from './MovingDebates.module.css'

/** Les débats qui bougent : les sujets où des prises de position viennent d'être ajoutées. */
export default function MovingDebates({ moving }: { moving: MovingDebate[] }) {
  if (moving.length === 0) return null

  return (
    <HomeSection
      title="Les débats qui bougent"
      note="là où des prises de position viennent d’être ajoutées"
    >
      <ul className={styles.cards}>
        {moving.map((entry) => (
          <MovingDebateCard key={entry.debate.id} moving={entry} />
        ))}
      </ul>
    </HomeSection>
  )
}
