import Link from 'next/link'
import { Option } from 'effect'
import OrganisationLogo from '../../../../components/organisations/OrganisationLogo'
import { MembershipWithOrganisation } from '../../../../domain/repositories/organisation-membership-repository'
import { membershipPeriodLabel } from '../../../../lib/membership-period'
import styles from './FigureEngagements.module.css'

/** Un engagement terminé, jalon de la frise : le logo effacé, la période, le nom. */
export default function PastEngagement({
  engagement: { membership, organisation },
}: {
  engagement: MembershipWithOrganisation
}) {
  const role = Option.getOrNull(membership.role)
  const period = membershipPeriodLabel(membership)

  return (
    <li className={styles.pastItem}>
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
      <Link href={`/o/${organisation.slug}`} className={styles.pastLink}>
        {period && <span className={styles.period}>{period}</span>}
        <span className={styles.pastName}>{organisation.name}</span>
        {role && <span className={styles.meta}>{role}</span>}
      </Link>
    </li>
  )
}
