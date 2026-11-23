import Link from 'next/link'
import AuthorAvatar from '../AuthorAvatar'
import ArgumentChips from '../ArgumentChips'
import StatementBody from '../StatementBody'
import StatementSource from '../StatementSource'
import EditLink from '../../ui/EditLink'
import { roleOf } from '../../../domain/read-models/author-role'
import { positionHref } from '../../../domain/read-models/hrefs'
import {
  authorOnSubjectHref,
  StatementAuthorRef,
} from '../../../domain/read-models/statement-author'
import { PositionGroup } from '../../../domain/services/author-on-subject'
import styles from './AuthorPositions.module.css'

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
        <Link href={positionHref(subjectSlug, position.slug)} className={styles.positionLink}>
          {position.title}
        </Link>
      </h3>

      {statements.map(({ statement, arguments: used }) => (
        <div key={statement.id} className={styles.statement}>
          <StatementBody content={statement.content} />
          <StatementSource statement={statement}>
            {editHref && <EditLink href={editHref(statement.id)} />}
          </StatementSource>
          <ArgumentChips arguments={used} />
        </div>
      ))}

      {allies.length > 0 && (
        <div className={styles.allies}>
          <p className={styles.alliesLabel}>Même position</p>
          <ul className={styles.allyList}>
            {allies.map((ally) => {
              // `roleOf` sait qu'une organisation alliée n'a pas de métier à
              // chercher dans une table indexée par personnalité.
              const role = roleOf(ally, roles)
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
