import Link from 'next/link'
import FigureAvatar from '../../figures/FigureAvatar'
import { formatShortDate } from '../../../lib/format-date'
import styles from './StatementList.module.css'
import { LatestStatement } from '../../../domain/entities/statement'

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
            <FigureAvatar
              slug={statement.publicFigureSlug}
              name={statement.publicFigureName}
              size={36}
            />
            <div className={styles.statementContent}>
              <p className={styles.publicFigureText}>
                <Link href={`/p/${statement.publicFigureSlug}`}>
                  <strong>{statement.publicFigureName}</strong>
                </Link>{' '}
                s&apos;est déclaré·e pour{' '}
                <Link href={`/p/${statement.publicFigureSlug}/s/${statement.subjectSlug}`}>
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
