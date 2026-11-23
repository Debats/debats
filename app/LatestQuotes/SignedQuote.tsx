import Link from 'next/link'
import AuthorAvatar from '../../components/statements/AuthorAvatar'
import { JointDeclarationRef } from '../../domain/entities/joint-declaration'
import { jointDeclarationHref } from '../../domain/read-models/hrefs'
import { authorHref, StatementAuthorRef } from '../../domain/read-models/statement-author'
import { formatShortDate } from '../../lib/format-date'
import styles from './LatestQuotes.module.css'

interface SignedQuoteProps {
  author: StatementAuthorRef
  declaration: JointDeclarationRef
  /** La source et le jour du texte, qui sont ceux de chaque signature */
  source: { name: string; statedAt: Date }
}

/**
 * La signature d'une déclaration commune dans le rail de l'accueil : qui a
 * signé quel texte, une seule fois par signataire. Les positions que le texte
 * prend se lisent sur sa page.
 */
export default function SignedQuote({ author, declaration, source }: SignedQuoteProps) {
  return (
    <li className={styles.entry}>
      <p className={styles.meta}>
        {formatShortDate(source.statedAt)} · {source.name}
      </p>
      <div className={styles.who}>
        <AuthorAvatar author={author} size={36} />
        <p className={styles.line}>
          <Link href={authorHref(author)} className={styles.name}>
            {author.name}
          </Link>{' '}
          a signé{' '}
          <Link href={jointDeclarationHref(declaration)} className={styles.subject}>
            {declaration.title}
          </Link>
        </p>
      </div>
    </li>
  )
}
