import Link from 'next/link'
import { takeJointPositionHref } from '../../../../../domain/read-models/hrefs'
import styles from './AttachStatementForm.module.css'

interface AttachmentRefusedProps {
  declaration: { title: string; slug: string }
}

/**
 * Pourquoi la prise de position ne peut pas être la signature du texte
 * choisi, et ce qu'on peut y faire : le texte ne prend pas encore sa
 * position, quoi qu'il défende par ailleurs sur le même sujet.
 */
export default function AttachmentRefused({ declaration }: AttachmentRefusedProps) {
  return (
    <p className={styles.alert} role="alert">
      « {declaration.title} » ne prend pas encore cette position. Si le texte la défend,{' '}
      <Link href={takeJointPositionHref(declaration)} className={styles.hintLink}>
        ajoutez-la d’abord au texte
      </Link>
      , puis revenez rattacher la prise de position.
    </p>
  )
}
