import Link from 'next/link'
import AuthorAvatar from '../../components/statements/AuthorAvatar'
import StatementBody from '../../components/statements/StatementBody'
import { FEED_PATH } from '../../domain/read-models/statement-feed'
import { subjectHref } from '../../domain/read-models/hrefs'
import { authorHref, authorOnSubjectHref } from '../../domain/read-models/statement-author'
import { StatementWithAuthorAndSubject } from '../../domain/repositories/statement-repository'
import { formatShortDate } from '../../lib/format-date'
import HomeSection from '../HomeSection'
import styles from './LatestQuotes.module.css'

/**
 * Les dernières prises de position du site, dans le rail de l'accueil : qui,
 * sur quel sujet, ce qui a été dit ou fait, pour quelle position.
 */
export default function LatestQuotes({ entries }: { entries: StatementWithAuthorAndSubject[] }) {
  if (entries.length === 0) return null

  return (
    <HomeSection
      title="Dernières prises de position"
      more={{ href: FEED_PATH, label: 'Tout le flux' }}
    >
      <ol className={styles.list}>
        {entries.map(({ statement, author, position, subject }) => (
          <li key={statement.id} className={styles.entry}>
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
              <Link
                href={authorOnSubjectHref(author, subject.slug)}
                className={styles.positionLink}
              >
                {position.title}
              </Link>
            </p>
          </li>
        ))}
      </ol>
    </HomeSection>
  )
}
