import Link from 'next/link'
import { JointDeclarationRef } from '../../../domain/entities/joint-declaration'
import { jointDeclarationHref } from '../../../domain/read-models/hrefs'
import styles from './SignedJointlyNotice.module.css'

interface SignedJointlyNoticeProps {
  declaration: JointDeclarationRef
}

/**
 * L'avis posé en tête du formulaire de modification d'une signature : ce
 * qu'elle dit est ce que dit le texte, pour tou·tes ses signataires. Seuls
 * ses arguments lui sont propres.
 */
export default function SignedJointlyNotice({ declaration }: SignedJointlyNoticeProps) {
  return (
    <div className={styles.notice} role="note">
      <p className={styles.text}>
        Cette prise de position est la signature d’une déclaration commune :{' '}
        <Link href={jointDeclarationHref(declaration)} className={styles.link}>
          {declaration.title}
        </Link>
        .
      </p>
      <p className={styles.text}>
        Sa position, sa citation, sa source et sa date sont celles du texte, pour chaque signataire
        : elles ne se modifient pas ici. Seuls ses arguments lui sont propres.
      </p>
    </div>
  )
}
