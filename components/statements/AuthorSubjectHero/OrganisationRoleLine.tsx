import { ORGANISATION_TYPE_LABELS, OrganisationType } from '../../../domain/entities/organisation'
import { plural } from '../../../lib/plural'
import styles from './AuthorSubjectHero.module.css'

/**
 * Ce qui nomme une organisation sous son nom : son type, et combien de
 * personnalités le site lui connaît. Une organisation n'a pas de métier :
 * jusqu'ici le bandeau lui tendait la ligne de rôle d'une personnalité,
 * qu'elle rendait toujours vide.
 */
export default function OrganisationRoleLine({
  organisationType,
  members,
}: {
  organisationType: OrganisationType
  /** Ses membres actuels, recensés ici */
  members: number
}) {
  return (
    <p className={styles.role}>
      <span className={styles.roleChip}>{ORGANISATION_TYPE_LABELS[organisationType]}</span>
      {members > 0 && (
        <span className={styles.roleChip}>
          {members} {plural(members, 'membre recensé·e', 'membres recensé·es')}
        </span>
      )}
    </p>
  )
}
