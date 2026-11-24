import Link from 'next/link'
import AuthorAvatar from '../../../../components/statements/AuthorAvatar'
import { Signatory } from '../../../../domain/read-models/joint-declaration'
import { authorHref } from '../../../../domain/read-models/statement-author'
import styles from './SignatoriesCard.module.css'

interface SignatoryLineProps {
  signatory: Signatory
}

/** Un·e signataire dans le rail : son visage ou son logo, son nom, son rôle sur une ligne. */
export default function SignatoryLine({ signatory }: SignatoryLineProps) {
  const { author, role } = signatory

  return (
    <Link href={authorHref(author)} className={styles.line}>
      <AuthorAvatar author={author} size={32} />
      <span className={styles.who}>
        <span className={styles.name}>{author.name}</span>
        {role && (
          <span className={styles.role} title={role}>
            {role}
          </span>
        )}
      </span>
    </Link>
  )
}
