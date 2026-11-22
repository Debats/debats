import Link from 'next/link'
import { JointDeclarationOption } from '../../../app/actions/joint-declarations'
import { jointDeclarationHref } from '../../../domain/read-models/hrefs'
import Button from '../../ui/Button'
import styles from './NewStatementForm.module.css'

interface JointSourceHintProps {
  declaration: JointDeclarationOption
  onSign: () => void
  onDismiss: () => void
}

/**
 * The net under the door: the source typed is the one of a joint declaration
 * the site knows, so the statement may be a signature that was not said to
 * be one. Asked once, never enforced: a declaration made beside the text —
 * an interview about it — bears the same link and is a statement of its own.
 */
export default function JointSourceHint({ declaration, onSign, onDismiss }: JointSourceHintProps) {
  return (
    <div className={styles.sourceHint} role="status">
      <p className={styles.sourceHintText}>
        Cette source est celle d’une déclaration commune :{' '}
        <Link href={jointDeclarationHref(declaration)} className={styles.sourceHintLink}>
          {declaration.title}
        </Link>
        . S’agit-il d’une signature de ce texte ?
      </p>
      <div className={styles.sourceHintActions}>
        <Button size="small" onClick={onSign}>
          Oui, ajouter la signature
        </Button>
        <Button size="small" variant="secondary" onClick={onDismiss}>
          Non, c’est une déclaration à part
        </Button>
      </div>
    </div>
  )
}
