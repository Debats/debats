import Link from 'next/link'
import AuthorAvatar from '../../statements/AuthorAvatar'
import { formatShortDate } from '../../../lib/format-date'
import styles from './StatementList.module.css'
import { LatestStatement } from '../../../domain/read-models/latest-statement'
import { authorHref, authorOnSubjectHref } from '../../../domain/read-models/statement-author'

interface StatementListProps {
  title: string
  statements: LatestStatement[]
}

export default function StatementList({ title, statements }: StatementListProps) {
  if (statements.length === 0) return null

  return (
    <div>
      <h2 className={styles.title}>{title}</h2>
      <ul className={styles.statementsList}>
        {statements.map((statement) => (
          <li key={statement.statementId} className={styles.statementItem}>
            <AuthorAvatar author={statement.author} size={36} />
            <div className={styles.statementContent}>
              <p className={styles.publicFigureText}>
                <Link href={authorHref(statement.author)}>
                  <strong>{statement.author.name}</strong>
                </Link>{' '}
                {statement.author.kind === 'organisation'
                  ? 'a pris position pour'
                  : 's’est déclaré·e pour'}{' '}
                <Link href={authorOnSubjectHref(statement.author, statement.subjectSlug)}>
                  <em>{statement.positionTitle}</em>
                </Link>{' '}
                dans le débat{' '}
                <Link href={`/s/${statement.subjectSlug}`}>
                  <strong>{statement.subjectTitle}</strong>
                </Link>
              </p>
              <p className={styles.date}>{formatShortDate(statement.statedAt)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
