import { UnreadableText } from './useJointSignature'
import styles from './NewStatementForm.module.css'

interface UnreadableSignatureProps {
  reason: UnreadableText
  onReadAgain: () => void
}

/**
 * The text chosen could not be read, so the form cannot say what signing it
 * makes — and does not send a signature it cannot describe. A text the site
 * no longer has is to be chosen again; a reading that failed is to be tried
 * again.
 */
export default function UnreadableSignature({ reason, onReadAgain }: UnreadableSignatureProps) {
  return (
    <p className={styles.fieldError} role="alert">
      {reason === 'missing' ? (
        'Cette déclaration commune est introuvable : elle a peut-être été renommée. Cherchez-la de nouveau par son titre.'
      ) : (
        <>
          Le texte n’a pas pu être lu, la signature ne peut pas être ajoutée pour l’instant.{' '}
          <button type="button" className={styles.inlineAction} onClick={onReadAgain}>
            Réessayer
          </button>
        </>
      )}
    </p>
  )
}
