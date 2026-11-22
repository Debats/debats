import ActionLink from '../../../../components/ui/ActionLink'
import Button from '../../../../components/ui/Button'
import {
  CONTRIBUTE_HREF,
  signJointDeclarationHref,
  takeJointPositionHref,
} from '../../../../domain/read-models/hrefs'
import styles from './AddSignature.module.css'

interface AddSignatureProps {
  declaration: { slug: string }
  /** Le texte prend au moins une position ; sinon une signature ne créerait rien, et n'est pas proposée */
  engaged: boolean
  /** La personne est connectée et peut ajouter une signature ; sinon on l'invite à contribuer */
  canSign: boolean
  /** La personne peut dire que le texte prend une position de plus */
  canComplete: boolean
}

/** Carte du rail : l'appel à ajouter une signature qui manque, ou une position que le texte prend. */
export default function AddSignature({
  declaration,
  engaged,
  canSign,
  canComplete,
}: AddSignatureProps) {
  // Nothing to sign, and nobody here who may say what the text takes position on: nothing to offer
  if (!engaged && !canComplete) return null

  return (
    <section className={styles.card}>
      {engaged ? (
        <>
          <h2 className={styles.title}>Il manque une signature ?</h2>
          <p className={styles.text}>
            Ajoutez un·e signataire : ses prises de position sur chaque sujet du texte sont créées
            d’un coup.
          </p>
          <Button href={canSign ? signJointDeclarationHref(declaration) : CONTRIBUTE_HREF}>
            {canSign ? 'Ajouter une signature' : 'Contribuer'}
          </Button>
        </>
      ) : (
        <>
          <h2 className={styles.title}>Ce texte ne prend plus position</h2>
          <p className={styles.text}>
            Dites sur quel sujet il s’engage, avec les mots qui l’énoncent : ses signataires
            prendront cette position, et il pourra de nouveau être signé.
          </p>
        </>
      )}
      {canComplete && (
        <ActionLink href={takeJointPositionHref(declaration)} quiet>
          {engaged ? 'Le texte prend une autre position' : 'Ajouter une position au texte'}
        </ActionLink>
      )}
    </section>
  )
}
