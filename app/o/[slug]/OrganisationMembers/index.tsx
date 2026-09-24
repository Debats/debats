import Link from 'next/link'
import { Option } from 'effect'
import FigureAvatar from '../../../../components/figures/FigureAvatar'
import RemoveMembershipButton from '../../../../components/organisations/RemoveMembershipButton'
import { MembershipWithFigure } from '../../../../domain/repositories/organisation-membership-repository'
import { membershipPeriodLabel } from './period'
import styles from './OrganisationMembers.module.css'

interface OrganisationMembersProps {
  organisationSlug: string
  current: MembershipWithFigure[]
  former: MembershipWithFigure[]
  /** L'utilisateur peut retirer une affiliation erronée */
  canRemove: boolean
}

function MemberRow({
  entry,
  organisationSlug,
  canRemove,
}: {
  entry: MembershipWithFigure
  organisationSlug: string
  canRemove: boolean
}) {
  const { membership, figure } = entry
  const details = [Option.getOrNull(membership.role), membershipPeriodLabel(membership)].filter(
    Boolean,
  )

  return (
    <li className={styles.row}>
      <FigureAvatar slug={figure.slug} name={figure.name} size={48} />
      <div className={styles.info}>
        <Link href={`/p/${figure.slug}`} className={styles.name}>
          {figure.name}
        </Link>
        {details.length > 0 && <span className={styles.details}>{details.join(' · ')}</span>}
      </div>
      {canRemove && (
        <div className={styles.remove}>
          <RemoveMembershipButton
            membershipId={membership.id}
            organisationSlug={organisationSlug}
            figureName={figure.name}
          />
        </div>
      )}
    </li>
  )
}

function MemberGroup({
  title,
  entries,
  organisationSlug,
  canRemove,
}: {
  title: string
  entries: MembershipWithFigure[]
  organisationSlug: string
  canRemove: boolean
}) {
  if (entries.length === 0) return null
  return (
    <section className={styles.group}>
      <h3 className={styles.groupTitle}>{title}</h3>
      <ul className={styles.list}>
        {entries.map((entry) => (
          <MemberRow
            key={entry.membership.id}
            entry={entry}
            organisationSlug={organisationSlug}
            canRemove={canRemove}
          />
        ))}
      </ul>
    </section>
  )
}

/** Les personnalités affiliées à une organisation, membres actuel·les puis ancien·nes. */
export default function OrganisationMembers({
  organisationSlug,
  current,
  former,
  canRemove,
}: OrganisationMembersProps) {
  if (current.length === 0 && former.length === 0) {
    return (
      <p className={styles.empty}>
        Aucune personnalité n&apos;est encore affiliée à cette organisation.
      </p>
    )
  }

  return (
    <div className={styles.card}>
      <MemberGroup
        title="Membres actuel·les"
        entries={current}
        organisationSlug={organisationSlug}
        canRemove={canRemove}
      />
      <MemberGroup
        title="Ancien·nes membres"
        entries={former}
        organisationSlug={organisationSlug}
        canRemove={canRemove}
      />
    </div>
  )
}
