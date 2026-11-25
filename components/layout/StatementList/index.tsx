import Link from 'next/link'
import AuthorAvatar from '../../statements/AuthorAvatar'
import AuthorAvatarStack from '../../statements/AuthorAvatarStack'
import SignedTogether from '../../statements/SignedTogether'
import TookTogether from '../../statements/TookTogether'
import { formatShortDate } from '../../../lib/format-date'
import styles from './StatementList.module.css'
import { FeedEntry, leadOf } from '../../../domain/read-models/feed-entries'
import { subjectHref } from '../../../domain/read-models/hrefs'
import { authorHref, authorOnSubjectHref } from '../../../domain/read-models/statement-author'

interface StatementListProps {
  title: string
  /** Des entrées du flux : une prise de position, les signatures d'un texte, ou ce qu'un·e auteur·rice a dit le même jour */
  entries: FeedEntry[]
  /** Le jour que la liste affiche : celui où la position a été prise, ou celui de son ajout au site */
  datedBy?: 'stated' | 'added'
}

export default function StatementList({ title, entries, datedBy = 'stated' }: StatementListProps) {
  if (entries.length === 0) return null

  return (
    <div>
      <h2 className={styles.title}>{title}</h2>
      <ul className={styles.statementsList}>
        {entries.map((entry) => {
          const { statement, author, position, subject } = leadOf(entry)
          return (
            <li key={statement.id} className={styles.statementItem}>
              {entry.kind === 'signatures' ? (
                <AuthorAvatarStack authors={entry.named} max={entry.named.length} size={36} />
              ) : (
                <AuthorAvatar author={author} size={36} />
              )}
              <div className={styles.statementContent}>
                <p className={styles.publicFigureText}>
                  {entry.kind === 'signatures' && (
                    <SignedTogether
                      declaration={entry.declaration}
                      named={entry.named}
                      others={entry.others}
                      nameClassName={styles.name}
                      titleClassName={styles.position}
                    />
                  )}
                  {entry.kind === 'sameDay' && (
                    <TookTogether
                      author={entry.author}
                      entries={entry.entries}
                      nameClassName={styles.name}
                      positionClassName={styles.position}
                    />
                  )}
                  {entry.kind === 'statement' && (
                    <>
                      <Link href={authorHref(author)} className={styles.name}>
                        {author.name}
                      </Link>{' '}
                      {author.kind === 'organisation'
                        ? 'a pris position pour'
                        : 's’est déclaré·e pour'}{' '}
                      <Link
                        href={authorOnSubjectHref(author, subject.slug)}
                        className={styles.position}
                      >
                        {position.title}
                      </Link>{' '}
                      dans le débat{' '}
                      <Link href={subjectHref(subject.slug)} className={styles.name}>
                        {subject.title}
                      </Link>
                    </>
                  )}
                </p>
                <p className={styles.date}>
                  {formatShortDate(datedBy === 'added' ? statement.createdAt : statement.statedAt)}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
