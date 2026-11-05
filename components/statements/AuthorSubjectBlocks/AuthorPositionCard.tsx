import Link from 'next/link'
import AuthorAvatar from '../AuthorAvatar'
import ArgumentChips from '../ArgumentChips'
import StatementBody from '../StatementBody'
import EditLink from '../../ui/EditLink'
import { STATEMENT_TYPE_LABELS, statementTypeOf } from '../../../domain/entities/statement'
import {
  authorOnSubjectHref,
  StatementAuthorRef,
} from '../../../domain/read-models/statement-author'
import { PositionGroup } from '../../../domain/services/author-on-subject'
import { formatShortDate } from '../../../lib/format-date'
import styles from './AuthorSubjectBlocks.module.css'

interface AuthorPositionCardProps {
  subjectSlug: string
  group: PositionGroup
  /** Les autres qui ont pris la même position */
  allies: StatementAuthorRef[]
  /** Le métier actuel de chaque personnalité, pour la nommer sous son nom */
  roles: Map<string, string>
  editHref?: (statementId: string) => string
}

/** Une position de l'auteur, ses prises de position, et qui le rejoint. */
export default function AuthorPositionCard({
  subjectSlug,
  group,
  allies,
  roles,
  editHref,
}: AuthorPositionCardProps) {
  const { position, statements } = group

  return (
    <article className={styles.card}>
      <p className={styles.kicker}>Sa position</p>
      <h3 className={styles.positionTitle}>
        <Link href={`/s/${subjectSlug}/position/${position.slug}`} className={styles.positionLink}>
          {position.title}
        </Link>
      </h3>

      {statements.map(({ statement, arguments: used }) => (
        <div key={statement.id} className={styles.statement}>
          <StatementBody content={statement.content} />
          <div className={styles.source}>
            <span className={styles.type}>
              {STATEMENT_TYPE_LABELS[statementTypeOf(statement.content)]}
            </span>
            <a
              href={statement.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.sourceLink}
            >
              {statement.sourceName}
            </a>
            <span className={styles.separator}>·</span>
            <span className={styles.date}>{formatShortDate(statement.statedAt)}</span>
            {editHref && <EditLink href={editHref(statement.id)} />}
          </div>
          <ArgumentChips arguments={used} />
        </div>
      ))}

      {allies.length > 0 && (
        <div className={styles.allies}>
          <p className={styles.alliesLabel}>Même position</p>
          <ul className={styles.allyList}>
            {allies.map((ally) => {
              // `roles` est indexé par personnalité : une organisation alliée
              // n'a pas de métier, et n'a donc rien à chercher là-dedans.
              const role = ally.kind === 'public_figure' ? roles.get(ally.id) : undefined
              return (
                <li key={`${ally.kind}-${ally.id}`}>
                  <Link href={authorOnSubjectHref(ally, subjectSlug)} className={styles.ally}>
                    <AuthorAvatar author={ally} size={32} />
                    <span className={styles.allyBody}>
                      <span className={styles.allyName}>{ally.name}</span>
                      {role && <span className={styles.allyRole}>{role}</span>}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </article>
  )
}
