import Link from 'next/link'
import AuthorAvatar from '../../components/statements/AuthorAvatar'
import StatementBody from '../../components/statements/StatementBody'
import { subjectHref } from '../../domain/read-models/hrefs'
import { authorHref, authorOnSubjectHref } from '../../domain/read-models/statement-author'
import { StatementWithAuthorAndSubject } from '../../domain/repositories/statement-repository'
import { formatShortDate } from '../../lib/format-date'
import styles from './LatestQuotes.module.css'

/**
 * Une prise de position propre à son auteur·rice dans le rail de l'accueil :
 * qui, sur quel sujet, ce qui a été dit ou fait, pour quelle position.
 */
export default function StatedQuote({ entry }: { entry: StatementWithAuthorAndSubject }) {
  const { statement, author, position, subject } = entry

  return (
    <li className={styles.entry}>
      <p className={styles.meta}>
        {formatShortDate(statement.statedAt)} · {statement.sourceName}
      </p>
      <div className={styles.who}>
        <AuthorAvatar author={author} size={36} />
        <p className={styles.line}>
          <Link href={authorHref(author)} className={styles.name}>
            {author.name}
          </Link>{' '}
          sur{' '}
          <Link href={subjectHref(subject.slug)} className={styles.subject}>
            {subject.title}
          </Link>
        </p>
      </div>
      <StatementBody content={statement.content} />
      <p className={styles.position}>
        pour{' '}
        <Link href={authorOnSubjectHref(author, subject.slug)} className={styles.positionLink}>
          {position.title}
        </Link>
      </p>
    </li>
  )
}
