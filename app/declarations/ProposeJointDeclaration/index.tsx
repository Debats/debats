import Button from '../../../components/ui/Button'
import { CONTRIBUTE_HREF, NEW_JOINT_DECLARATION_HREF } from '../../../domain/read-models/hrefs'
import styles from './ProposeJointDeclaration.module.css'

interface ProposeJointDeclarationProps {
  /** La personne est connectée et peut référencer un texte ; sinon on l'invite à contribuer */
  canPropose: boolean
}

/** Encart du rail, en encre sur papier : l'appel à référencer un texte qui manque. */
export default function ProposeJointDeclaration({ canPropose }: ProposeJointDeclarationProps) {
  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Une tribune manque à l’appel ?</h2>
      <p className={styles.text}>
        Référencez le texte, les positions qu’il prend, puis ajoutez ses signataires un·e à un·e.
      </p>
      <Button href={canPropose ? NEW_JOINT_DECLARATION_HREF : CONTRIBUTE_HREF} variant="inverse">
        {canPropose ? 'Proposer une déclaration commune' : 'Contribuer'}
      </Button>
    </section>
  )
}
