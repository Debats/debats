import Link from 'next/link'
import { AttachmentRefusal } from '../../../../../domain/read-models/attachment-plan'
import {
  jointDeclarationHref,
  takeJointPositionHref,
} from '../../../../../domain/read-models/hrefs'
import styles from './AttachStatementForm.module.css'

interface AttachmentRefusedProps {
  refusal: AttachmentRefusal
  declaration: { title: string; slug: string }
}

/**
 * Pourquoi la prise de position ne peut pas être la signature du texte
 * choisi, et ce qu'on peut y faire.
 */
export default function AttachmentRefused({ refusal, declaration }: AttachmentRefusedProps) {
  return (
    <p className={styles.alert} role="alert">
      {refusal === 'silent' ? (
        <>
          « {declaration.title} » ne prend pas position sur ce sujet. Si le texte le fait,{' '}
          <Link href={takeJointPositionHref(declaration)} className={styles.hintLink}>
            ajoutez d’abord cette position au texte
          </Link>
          , puis revenez rattacher la prise de position.
        </>
      ) : (
        <>
          « {declaration.title} » prend une autre position sur ce sujet : cette prise de position ne
          peut pas en être la signature.{' '}
          <Link href={jointDeclarationHref(declaration)} className={styles.hintLink}>
            Voir ce que défend le texte
          </Link>
          .
        </>
      )}
    </p>
  )
}
