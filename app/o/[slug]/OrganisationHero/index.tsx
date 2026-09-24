import DetailHero, { ExternalLink } from '../../../../components/layout/DetailHero'
import OrganisationLogo from '../../../../components/organisations/OrganisationLogo'
import { plural } from '../../../../lib/plural'
import styles from './OrganisationHero.module.css'

interface OrganisationCounts {
  statements: number
  subjects: number
  members: number
}

interface OrganisationHeroProps {
  slug: string
  name: string
  acronym: string | null
  typeLabel: string
  presentation: string
  links: ExternalLink[]
  counts: OrganisationCounts
  /** Menu d'administration affiché à côté du nom, si l'utilisateur y a droit */
  adminMenu?: React.ReactNode
  /** Action principale et partage */
  actions: React.ReactNode
}

export default function OrganisationHero({
  slug,
  name,
  acronym,
  typeLabel,
  presentation,
  links,
  counts,
  adminMenu,
  actions,
}: OrganisationHeroProps) {
  return (
    <DetailHero
      kicker={
        <>
          <span className={styles.label}>Organisation</span>
          <span className={styles.typeTag}>{typeLabel}</span>
        </>
      }
      media={<OrganisationLogo slug={slug} name={name} acronym={acronym} size={96} />}
      title={name}
      titleAside={
        <>
          {acronym && <span className={styles.acronym}>{acronym}</span>}
          {adminMenu}
        </>
      }
      presentation={presentation}
      links={links}
      stats={[
        {
          value: counts.statements,
          label: plural(counts.statements, 'prise de position', 'prises de position'),
        },
        { value: counts.subjects, label: plural(counts.subjects, 'sujet', 'sujets') },
        {
          value: counts.members,
          label: plural(counts.members, 'personnalité affiliée', 'personnalités affiliées'),
        },
      ]}
      actions={actions}
    />
  )
}
