import Link from 'next/link'
import { Option } from 'effect'
import OrganisationLogo from '../../../../components/organisations/OrganisationLogo'
import { organisationHref } from '../../../../domain/read-models/hrefs'
import { MembershipWithOrganisation } from '../../../../domain/repositories/organisation-membership-repository'
import { membershipPeriodLabel } from '../../../../lib/membership-period'
import styles from './FigureEngagements.module.css'

/** An engagement that has ended, a milestone on the thread: faded logo, period, name. */
export default function FormerEngagement({
  affiliation: { membership, organisation },
  today,
}: {
  affiliation: MembershipWithOrganisation
  today: Date
}) {
  const role = Option.getOrNull(membership.role)
  const period = membershipPeriodLabel(membership, today)

  return (
    <li className={styles.formerItem}>
      <span className={styles.rail}>
        <span className={styles.faded}>
          <OrganisationLogo
            slug={organisation.slug}
            name={organisation.name}
            acronym={organisation.acronym}
            size={28}
          />
        </span>
        <span className={styles.thread} />
      </span>
      <Link href={organisationHref(organisation.slug)} className={styles.formerLink}>
        {period && <span className={styles.period}>{period}</span>}
        <span className={styles.formerName}>{organisation.name}</span>
        {role && <span className={styles.meta}>{role}</span>}
      </Link>
    </li>
  )
}
