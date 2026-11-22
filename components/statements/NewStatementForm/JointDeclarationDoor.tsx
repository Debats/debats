import ChoiceCard from '../../ui/ChoiceCard'
import styles from './NewStatementForm.module.css'

interface JointDeclarationDoorProps {
  signing: boolean
  onOwn: () => void
  onSignature: () => void
}

/**
 * The question asked once the author is known: is this a statement of their
 * own, or their signature under a text signed by several? The answer decides
 * what the rest of the form asks.
 */
export default function JointDeclarationDoor({
  signing,
  onOwn,
  onSignature,
}: JointDeclarationDoorProps) {
  return (
    <fieldset className={styles.section}>
      <legend className={styles.sectionTitle}>Cette prise de position…</legend>
      <div className={styles.options}>
        <ChoiceCard
          name="statementOrigin"
          checked={!signing}
          onChange={onOwn}
          note="Un entretien, un discours, un vote, un programme, un acte."
        >
          lui est propre
        </ChoiceCard>
        <ChoiceCard
          name="statementOrigin"
          checked={signing}
          onChange={onSignature}
          note="Une tribune, un manifeste, un appel, une lettre ouverte."
        >
          est la signature d’une déclaration commune
        </ChoiceCard>
      </div>
    </fieldset>
  )
}
