import Link from 'next/link'
import AuthorAvatar from '../../../../components/statements/AuthorAvatar'
import StatementBody from '../../../../components/statements/StatementBody'
import StatementSource from '../../../../components/statements/StatementSource'
import { authorOnSubjectHref } from '../../../../domain/read-models/statement-author'
import { ArgumentSubjectUsage } from '../../../../domain/services/argument-usage'
import { plural } from '../../../../lib/plural'
import styles from './ArgumentUsage.module.css'

interface ArgumentUsageProps {
  usage: ArgumentSubjectUsage[]
}

/** Où un argument sert : sujet par sujet, position par position, avec chaque citation. */
export default function ArgumentUsage({ usage }: ArgumentUsageProps) {
  if (usage.length === 0) {
    return <p className={styles.empty}>Aucune prise de position ne mobilise encore cet argument.</p>
  }

  return (
    <div className={styles.card}>
      {usage.map(({ subject, positions, statementsCount }) => (
        <article key={subject.id} className={styles.subject}>
          <div className={styles.subjectHead}>
            <Link href={`/s/${subject.slug}`} className={styles.subjectTitle}>
              {subject.title}
            </Link>
            <span className={styles.subjectCount}>
              {statementsCount} {plural(statementsCount, 'prise de position', 'prises de position')}
            </span>
          </div>
          {positions.map(({ position, entries }) => (
            <section key={position.id} className={styles.position}>
              <Link
                href={`/s/${subject.slug}/position/${position.slug}`}
                className={styles.positionTitle}
              >
                {position.title}
              </Link>
              <ul className={styles.entries}>
                {entries.map(({ statement, author }) => (
                  <li key={statement.id} className={styles.entry}>
                    <Link
                      href={authorOnSubjectHref(author, subject.slug)}
                      className={styles.author}
                    >
                      <AuthorAvatar author={author} size={32} />
                      <span className={styles.authorName}>{author.name}</span>
                    </Link>
                    <StatementBody content={statement.content} />
                    <StatementSource statement={statement} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </article>
      ))}
    </div>
  )
}
