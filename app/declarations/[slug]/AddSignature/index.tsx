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
  /** La personne est connectée et peut ajouter une signature ; sinon on l'invite à contribuer */
  canSign: boolean
  /** La personne peut dire que le texte prend une position de plus */
  canComplete: boolean
}

/** Carte du rail : l'appel à ajouter une signature qui manque, ou une position que le texte prend. */
export default function AddSignature({ declaration, canSign, canComplete }: AddSignatureProps) {
  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Il manque une signature ?</h2>
      <p className={styles.text}>
        Ajoutez un·e signataire : ses prises de position sur chaque sujet du texte sont créées d’un
        coup.
      </p>
      <Button href={canSign ? signJointDeclarationHref(declaration) : CONTRIBUTE_HREF}>
        {canSign ? 'Ajouter une signature' : 'Contribuer'}
      </Button>
      {canComplete && (
        <ActionLink href={takeJointPositionHref(declaration)} quiet>
          Le texte prend une autre position
        </ActionLink>
      )}
    </section>
  )
}
