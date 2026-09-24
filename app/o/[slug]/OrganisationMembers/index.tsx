import Link from 'next/link'
import { Option } from 'effect'
import FigureAvatar from '../../../../components/figures/FigureAvatar'
import RemoveMembershipButton from '../../../../components/organisations/RemoveMembershipButton'
import ShowMore from '../../../../components/ui/ShowMore'
import { MembershipWithFigure } from '../../../../domain/repositories/organisation-membership-repository'
import { membershipPeriodLabel } from './period'
import styles from './OrganisationMembers.module.css'

interface OrganisationMembersProps {
  organisationSlug: string
  current: MembershipWithFigure[]
  former: MembershipWithFigure[]
  /** L'utilisateur peut affilier une personnalité */
  canAffiliate: boolean
  /** L'utilisateur peut retirer une affiliation erronée */
  canRemove: boolean
}

/** Membres affichés avant le bouton « Voir les autres » */
const INITIAL_MEMBERS = 8

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
    <div role="listitem" className={styles.row}>
      <FigureAvatar slug={figure.slug} name={figure.name} size={36} />
      <div className={styles.info}>
        <Link href={`/p/${figure.slug}`} className={styles.name}>
          {figure.name}
        </Link>
        {details.length > 0 && <span className={styles.details}>{details.join(' · ')}</span>}
      </div>
      {canRemove && (
        <RemoveMembershipButton
          membershipId={membership.id}
          organisationSlug={organisationSlug}
          figureName={figure.name}
        />
      )}
    </div>
  )
}

/** Encart du rail : les personnalités affiliées, membres actuel·les puis ancien·nes. */
export default function OrganisationMembers({
  organisationSlug,
  current,
  former,
  canAffiliate,
  canRemove,
}: OrganisationMembersProps) {
  const rows = (entries: MembershipWithFigure[]) =>
    entries.map((entry) => (
      <MemberRow
        key={entry.membership.id}
        entry={entry}
        organisationSlug={organisationSlug}
        canRemove={canRemove}
      />
    ))

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <p className={styles.title}>Personnalités affiliées</p>
        {canAffiliate && (
          <Link href={`/o/${organisationSlug}/affilier`} className={styles.action}>
            Affilier
          </Link>
        )}
      </div>

      {current.length === 0 && former.length === 0 ? (
        <p className={styles.empty}>Aucune personnalité n&apos;est encore affiliée.</p>
      ) : (
        <>
          {/* Des rôles de liste plutôt qu'un ul : ShowMore ajoute son bouton parmi les lignes */}
          {current.length > 0 && (
            <div role="list" className={styles.list}>
              <ShowMore
                items={rows(current)}
                initialCount={INITIAL_MEMBERS}
                moreLabel={`Voir les ${current.length - INITIAL_MEMBERS} autres`}
              />
            </div>
          )}
          {former.length > 0 && (
            <section className={styles.former}>
              <h3 className={styles.formerTitle}>Ancien·nes membres</h3>
              <div role="list" className={styles.list}>
                {rows(former)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
