import Link from 'next/link'
import { attachStatementHref } from '../../../domain/read-models/hrefs'
import styles from './AttachToDeclarationPrompt.module.css'

interface AttachToDeclarationPromptProps {
  statementId: string
}

/**
 * La porte posée en tête du formulaire de modification d'une prise de
 * position propre à son auteur·rice : si elle est en réalité la signature
 * d'une tribune ou d'un manifeste, elle se rattache au texte plutôt que de se
 * corriger à la main.
 */
export default function AttachToDeclarationPrompt({ statementId }: AttachToDeclarationPromptProps) {
  return (
    <p className={styles.prompt} role="note">
      Cette prise de position est la signature d’une tribune, d’un manifeste, d’un appel ?{' '}
      <Link href={attachStatementHref(statementId)} className={styles.link}>
        La rattacher à une déclaration commune
      </Link>
      .
    </p>
  )
}
