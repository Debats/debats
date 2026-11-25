import Link from 'next/link'
import AllyList from './AllyList'
import FoldedAllies from './FoldedAllies'
import AuthorAvatarStack from '../AuthorAvatarStack'
import ArgumentChips from '../ArgumentChips'
import StatementBody from '../StatementBody'
import StatementSource from '../StatementSource'
import EditLink from '../../ui/EditLink'
import { positionHref } from '../../../domain/read-models/hrefs'
import { StatementAuthorRef } from '../../../domain/read-models/statement-author'
import { PositionGroup } from '../../../domain/services/author-on-subject'
import styles from './AuthorPositions.module.css'

interface AuthorPositionCardProps {
  subjectSlug: string
  group: PositionGroup
  /** Il l'a quittée pour une autre : ce n'est plus la sienne */
  left: boolean
  /** Les autres qui ont pris la même position */
  allies: StatementAuthorRef[]
  /** Le métier actuel de chaque personnalité, pour la nommer sous son nom */
  roles: Map<string, string>
  editHref?: (statementId: string) => string
}

/** Au-delà, la liste des alliés se replie */
const UNFOLDED_ALLIES = 6

/** Visages montrés tant que la liste est repliée : le bouton dit le total */
const PREVIEWED_ALLIES = 6

/** Une position de l'auteur, ses prises de position, et qui le rejoint. */
export default function AuthorPositionCard({
  subjectSlug,
  group,
  left,
  allies,
  roles,
  editHref,
}: AuthorPositionCardProps) {
  const { position, statements } = group

  return (
    <article className={styles.card}>
      <p className={styles.kicker}>{left ? 'Position quittée' : 'Sa position'}</p>
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
          {allies.length > UNFOLDED_ALLIES ? (
            <FoldedAllies
              count={allies.length}
              preview={
                <AuthorAvatarStack
                  authors={allies.slice(0, PREVIEWED_ALLIES)}
                  max={PREVIEWED_ALLIES}
                  size={32}
                  subjectSlug={subjectSlug}
                />
              }
            >
              <AllyList subjectSlug={subjectSlug} allies={allies} roles={roles} />
            </FoldedAllies>
          ) : (
            <AllyList subjectSlug={subjectSlug} allies={allies} roles={roles} />
          )}
        </div>
      )}
    </article>
  )
}
