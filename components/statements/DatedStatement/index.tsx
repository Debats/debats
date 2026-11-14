import Link from 'next/link'
import { StatementContent } from '../../../domain/entities/statement'
import { ArgumentRef } from '../../../domain/read-models/argument'
import { authorHref, StatementAuthorRef } from '../../../domain/read-models/statement-author'
import { StatementTouch } from '../../../domain/read-models/statement-feed'
import { formatShortDate } from '../../../lib/format-date'
import ArgumentChips from '../ArgumentChips'
import AuthorAvatar from '../AuthorAvatar'
import StatementBody from '../StatementBody'
import StatementSource from '../StatementSource'
import styles from './DatedStatement.module.css'

interface DatedStatementProps {
  author: StatementAuthorRef
  /** What the author is today, named under her as the design asks */
  role?: string
  position: { title: string; href: string }
  /** Left out when every entry of the list stands on the same subject */
  subject?: { title: string; href: string }
  statement: {
    id: string
    content: StatementContent
    sourceName: string
    sourceUrl: string
    statedAt: Date
  }
  /** Given when the list is read by last touch: says why the entry stands where it does */
  touch?: StatementTouch
  arguments: ArgumentRef[]
}

const TOUCH_LABELS: Record<StatementTouch['kind'], string> = {
  added: 'ajoutée le',
  edited: 'modifiée le',
}

/** Une prise de position dans une liste datée : qui, pour quoi, la citation, d'où. */
export default function DatedStatement({
  author,
  role,
  position,
  subject,
  statement,
  touch,
  arguments: used,
}: DatedStatementProps) {
  return (
    <article className={styles.entry}>
      <AuthorAvatar author={author} size={44} />
      <div className={styles.body}>
        <p className={styles.head}>
          <Link href={authorHref(author)} className={styles.name}>
            {author.name}
          </Link>
          {role && <span className={styles.role}>{role}</span>}
        </p>
        <p className={styles.for}>
          pour{' '}
          <Link href={position.href} className={styles.position}>
            {position.title}
          </Link>
          {subject && (
            <>
              {' '}
              sur{' '}
              <Link href={subject.href} className={styles.subject}>
                {subject.title}
              </Link>
            </>
          )}
        </p>
        <StatementBody content={statement.content} />
        <StatementSource statement={statement}>
          {touch && (
            <span className={styles.touch}>
              {TOUCH_LABELS[touch.kind]} {formatShortDate(touch.at)}
            </span>
          )}
        </StatementSource>
        <ArgumentChips arguments={used} />
      </div>
    </article>
  )
}
