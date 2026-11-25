import Link from 'next/link'
import AuthorAvatar from '../../statements/AuthorAvatar'
import AuthorAvatarStack from '../../statements/AuthorAvatarStack'
import SignedTogether from '../../statements/SignedTogether'
import { formatShortDate } from '../../../lib/format-date'
import styles from './StatementList.module.css'
import { Gathered } from '../../../domain/read-models/gathered-signatures'
import { subjectHref } from '../../../domain/read-models/hrefs'
import { LatestStatement } from '../../../domain/read-models/latest-statement'
import { authorHref, authorOnSubjectHref } from '../../../domain/read-models/statement-author'

interface StatementListProps {
  title: string
  /** Les prises de position à lister, les signatures d'un même texte réunies en une entrée */
  entries: Gathered<LatestStatement>[]
}

export default function StatementList({ title, entries }: StatementListProps) {
  if (entries.length === 0) return null

  return (
    <div>
      <h2 className={styles.title}>{title}</h2>
      <ul className={styles.statementsList}>
        {entries.map((gathered) =>
          gathered.kind === 'signatures' ? (
            <li key={gathered.declaration.id} className={styles.statementItem}>
              <AuthorAvatarStack authors={gathered.named} max={gathered.named.length} size={36} />
              <div className={styles.statementContent}>
                <p className={styles.publicFigureText}>
                  <SignedTogether
                    declaration={gathered.declaration}
                    named={gathered.named}
                    others={gathered.others}
                    nameClassName={styles.name}
                    titleClassName={styles.declaration}
                  />
                </p>
                <p className={styles.date}>{formatShortDate(gathered.first.statedAt)}</p>
              </div>
            </li>
          ) : (
            <li key={gathered.entry.statementId} className={styles.statementItem}>
              <AuthorAvatar author={gathered.entry.author} size={36} />
              <div className={styles.statementContent}>
                <p className={styles.publicFigureText}>
                  <Link href={authorHref(gathered.entry.author)} className={styles.name}>
                    {gathered.entry.author.name}
                  </Link>{' '}
                  {gathered.entry.author.kind === 'organisation'
                    ? 'a pris position pour'
                    : 's’est déclaré·e pour'}{' '}
                  <Link
                    href={authorOnSubjectHref(gathered.entry.author, gathered.entry.subjectSlug)}
                  >
                    <em>{gathered.entry.positionTitle}</em>
                  </Link>{' '}
                  dans le débat{' '}
                  <Link href={subjectHref(gathered.entry.subjectSlug)} className={styles.name}>
                    {gathered.entry.subjectTitle}
                  </Link>
                </p>
                <p className={styles.date}>{formatShortDate(gathered.entry.statedAt)}</p>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  )
}
