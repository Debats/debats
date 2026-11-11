import Link from 'next/link'
import { Option } from 'effect'
import OrganisationLogo from '../../../../components/organisations/OrganisationLogo'
import { organisationHref } from '../../../../domain/read-models/hrefs'
import { MembershipWithOrganisation } from '../../../../domain/repositories/organisation-membership-repository'
import { membershipPeriodLabel } from '../../../../lib/membership-period'
import styles from './FigureEngagements.module.css'

/**
 * A running engagement: the logo, the organisation's name, the role and the
 * period when they are known, and the way to its statements. The whole block
 * is a single link to the organisation's page.
 */
export default function CurrentEngagement({
  affiliation: { membership, organisation },
  today,
}: {
  affiliation: MembershipWithOrganisation
  today: Date
}) {
  const role = Option.getOrNull(membership.role)
  const period = membershipPeriodLabel(membership, today)

  return (
    <li className={styles.currentItem}>
      <Link href={organisationHref(organisation.slug)} className={styles.feature}>
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
