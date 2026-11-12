import { PositionChange } from '../../domain/read-models/position-changes'
import HomeSection from '../HomeSection'
import PositionChangeCard from './PositionChangeCard'
import styles from './PositionChanges.module.css'

/**
 * Elle, il a changé de position : les derniers changements que le site a
 * relevés, la position quittée et la position prise, chacune datée. Sans
 * changement à montrer, le bloc ne se montre pas.
 */
export default function PositionChanges({ changes }: { changes: PositionChange[] }) {
  if (changes.length === 0) return null

  return (
    <HomeSection
      title="Elle, il a changé de position"
      note="chaque prise de position est datée : le site garde l’ancienne et la nouvelle"
    >
      <ul className={styles.cards}>
        {changes.map((change) => (
          <PositionChangeCard key={`${change.figure.id}-${change.subject.id}`} change={change} />
        ))}
      </ul>
    </HomeSection>
  )
}
