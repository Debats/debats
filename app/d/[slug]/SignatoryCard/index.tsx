import Link from 'next/link'
import AuthorAvatar from '../../../../components/statements/AuthorAvatar'
import { Signatory } from '../../../../domain/read-models/joint-declaration'
import { authorHref } from '../../../../domain/read-models/statement-author'
import styles from './SignatoryCard.module.css'

interface SignatoryCardProps {
  signatory: Signatory
}

/** Un·e signataire : son visage ou son logo, son nom, ce que le site sait de son rôle. */
export default function SignatoryCard({ signatory }: SignatoryCardProps) {
  const { author, role } = signatory

  return (
    <Link href={authorHref(author)} className={styles.card}>
      <AuthorAvatar author={author} size={48} />
      <span className={styles.who}>
        <span className={styles.name}>{author.name}</span>
        {role && <span className={styles.role}>{role}</span>}
      </span>
    </Link>
  )
}
