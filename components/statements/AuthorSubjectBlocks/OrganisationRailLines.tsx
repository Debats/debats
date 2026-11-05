import { ORGANISATION_TYPE_LABELS, OrganisationType } from '../../../domain/entities/organisation'
import { plural } from '../../../lib/plural'
import styles from './AuthorSubjectBlocks.module.css'

/**
 * Ce qui présente une organisation dans le rail : son type et ses membres.
 * Une organisation n'a ni métier ni affiliation — c'est pour ça que la carte
 * reçoit ces lignes de la page, au lieu d'essayer de les deviner.
 *
 * Rien n'est lié ici : « Sa page complète », juste en dessous, mène déjà là
 * où ses membres sont listés.
 */
export default function OrganisationRailLines({
  organisationType,
  members,
}: {
  organisationType: OrganisationType
  /** Ses membres actuels, recensés ici */
  members: number
}) {
  return (
    <>
      <p className={styles.authorRole}>{ORGANISATION_TYPE_LABELS[organisationType]}</p>
      {members > 0 && (
        <p className={styles.authorRole}>
          {members} {plural(members, 'membre recensé·e', 'membres recensé·es')}
        </p>
      )}
    </>
  )
}
