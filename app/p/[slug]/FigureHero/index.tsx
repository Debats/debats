import FigureAvatar from '../../../../components/figures/FigureAvatar'
import DetailHero, { ExternalLink } from '../../../../components/layout/DetailHero'
import OrganisationTag from '../../../../components/organisations/OrganisationTag'
import ComingSoon from '../../../../components/ui/ComingSoon'
import { ActivityPeriod } from '../../../../domain/services/figure-activity'
import { plural } from '../../../../lib/plural'
import styles from './FigureHero.module.css'

interface FigureCounts {
  statements: number
  subjects: number
  period: ActivityPeriod | null
}

export interface Affiliation {
  organisationSlug: string
  /** Nom court de l'organisation : son sigle quand elle en a un */
  organisationLabel: string
  role: string | null
}

interface FigureHeroProps {
  slug: string
  name: string
  presentation: string
  links: ExternalLink[]
  counts: FigureCounts
  /** Organisations dont la personnalité est membre aujourd'hui */
  affiliations: Affiliation[]
  /** Menu d'administration affiché à côté du nom, si l'utilisateur y a droit */
  adminMenu?: React.ReactNode
  /** Action principale et partage */
  actions: React.ReactNode
}

function periodLabel(period: ActivityPeriod | null): string {
  if (!period) return '–'
  return period.from === period.to ? String(period.from) : `${period.from} → ${period.to}`
}

export default function FigureHero({
  slug,
  name,
  presentation,
  links,
  counts,
  affiliations,
  adminMenu,
  actions,
}: FigureHeroProps) {
  return (
    <DetailHero
      kicker={
        <>
          <span className={styles.label}>Personnalité</span>
          <ComingSoon>
            <span className={styles.tag}>Rôle</span>
          </ComingSoon>
          {affiliations.map((affiliation) => (
            <OrganisationTag
              key={affiliation.organisationSlug}
              slug={affiliation.organisationSlug}
              label={affiliation.organisationLabel}
              role={affiliation.role}
            />
          ))}
        </>
      }
      media={<FigureAvatar slug={slug} name={name} size={96} />}
      title={name}
      titleAside={adminMenu}
      presentation={presentation}
      links={links}
      stats={[
        {
          value: counts.statements,
          label: plural(counts.statements, 'prise de position', 'prises de position'),
        },
        { value: counts.subjects, label: plural(counts.subjects, 'sujet', 'sujets') },
        { value: periodLabel(counts.period), label: 'période', compact: true },
      ]}
      actions={actions}
    />
  )
}
