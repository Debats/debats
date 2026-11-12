import Link from 'next/link'
import AuthorAvatar from '../../components/statements/AuthorAvatar'
import StatementBody from '../../components/statements/StatementBody'
import StatementSource from '../../components/statements/StatementSource'
import { authorOnSubjectHref } from '../../domain/read-models/statement-author'
import { StatementWithAuthor } from '../../domain/repositories/statement-repository'
import styles from './DailySubject.module.css'

interface FacingQuoteProps {
  quoted: StatementWithAuthor
  subjectSlug: string
}

/** Les dernières paroles dites pour une position : la position, la citation, qui, d'où. */
export default function FacingQuote({ quoted, subjectSlug }: FacingQuoteProps) {
  const { statement, position, author } = quoted

  return (
    <figure className={styles.quote}>
      <p className={styles.quotePosition}>{position.title}</p>
      <StatementBody content={statement.content} />
      <figcaption className={styles.quoteAuthor}>
        <AuthorAvatar author={author} size={40} />
        <div className={styles.quoteBy}>
          <Link href={authorOnSubjectHref(author, subjectSlug)} className={styles.quoteName}>
            {author.name}
          </Link>
          <StatementSource statement={statement} />
        </div>
      </figcaption>
    </figure>
  )
}
