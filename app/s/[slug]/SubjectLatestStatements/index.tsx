import Link from 'next/link'
import AuthorAvatar from '../../../../components/statements/AuthorAvatar'
import ComingSoon from '../../../../components/ui/ComingSoon'
import { LatestStatement } from '../../../../domain/read-models/latest-statement'
import { authorHref, authorOnSubjectHref } from '../../../../domain/read-models/statement-author'
import { formatShortDate } from '../../../../lib/format-date'
import styles from './SubjectLatestStatements.module.css'

interface SubjectLatestStatementsProps {
  statements: LatestStatement[]
}

/** Les dernières prises de position du sujet, en format compact pour le rail. */
export default function SubjectLatestStatements({ statements }: SubjectLatestStatementsProps) {
  if (statements.length === 0) return null

  return (
    <section>
      <div className={styles.head}>
        <h2 className={styles.title}>Dernières prises de position</h2>
        <ComingSoon>
          <span className={styles.all}>Tout voir</span>
        </ComingSoon>
      </div>
      <ul className={styles.list}>
        {statements.map((statement) => (
          <li key={statement.statementId} className={styles.item}>
            <AuthorAvatar author={statement.author} size={36} />
            <div className={styles.body}>
              <p className={styles.text}>
                <Link href={authorHref(statement.author)} className={styles.name}>
                  {statement.author.name}
                </Link>
                <br />
                pour{' '}
                <Link
                  href={authorOnSubjectHref(statement.author, statement.subjectSlug)}
                  className={styles.position}
                >
                  {statement.positionTitle}
                </Link>
              </p>
              <p className={styles.meta}>
                {formatShortDate(statement.statedAt)} · {statement.sourceName}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
