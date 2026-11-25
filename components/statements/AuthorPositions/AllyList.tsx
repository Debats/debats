import Link from 'next/link'
import AuthorAvatar from '../AuthorAvatar'
import { roleOf } from '../../../domain/read-models/author-role'
import {
  authorOnSubjectHref,
  StatementAuthorRef,
} from '../../../domain/read-models/statement-author'
import styles from './AuthorPositions.module.css'

interface AllyListProps {
  subjectSlug: string
  allies: StatementAuthorRef[]
  /** Le métier actuel de chaque personnalité, pour la nommer sous son nom */
  roles: Map<string, string>
}

/** Les alliés, nommés : des liens vers leur page sur le sujet. */
export default function AllyList({ subjectSlug, allies, roles }: AllyListProps) {
  return (
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
  )
}
