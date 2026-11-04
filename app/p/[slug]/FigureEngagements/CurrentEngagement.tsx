import Link from 'next/link'
import { Option } from 'effect'
import OrganisationLogo from '../../../../components/organisations/OrganisationLogo'
import { MembershipWithOrganisation } from '../../../../domain/repositories/organisation-membership-repository'
import { membershipPeriodLabel } from '../../../../lib/membership-period'
import styles from './FigureEngagements.module.css'

/**
 * Un engagement en cours : le logo, le nom de l'organisation, le rôle et la
 * durée quand on les connaît, et l'accès à ses prises de position. Tout le
 * bloc est un seul lien vers la page de l'organisation.
 */
export default function CurrentEngagement({
  engagement: { membership, organisation },
}: {
  engagement: MembershipWithOrganisation
}) {
  const role = Option.getOrNull(membership.role)
  const period = membershipPeriodLabel(membership)

  return (
    <li className={styles.currentItem}>
      <Link href={`/o/${organisation.slug}`} className={styles.feature}>
        <span className={styles.identity}>
          <OrganisationLogo
            slug={organisation.slug}
            name={organisation.name}
            acronym={organisation.acronym}
            size={56}
          />
          <span>
            <span className={styles.name}>{organisation.name}</span>
            {(role || period) && (
              <span className={styles.meta}>
                {role}
                {role && period && ' · '}
                {period && <span className={styles.period}>{period}</span>}
              </span>
            )}
          </span>
        </span>
        <span className={styles.shortcut}>
          Prises de position
          <span className={styles.arrow} aria-hidden="true">
            →
          </span>
        </span>
      </Link>
    </li>
  )
}
