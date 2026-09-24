import DetailHero, { ExternalLink } from '../../../../components/layout/DetailHero'
import OrganisationLogo from '../../../../components/organisations/OrganisationLogo'
import { plural } from '../../../../lib/plural'
import styles from './OrganisationHero.module.css'

interface OrganisationHeroProps {
  slug: string
  name: string
  acronym: string | null
  typeLabel: string
  presentation: string
  links: ExternalLink[]
  membersCount: number
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
  membersCount,
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
          value: membersCount,
          label: plural(membersCount, 'personnalité affiliée', 'personnalités affiliées'),
        },
        { value: '–', label: 'prises de position', compact: true, soon: true },
        { value: '–', label: 'sujets', compact: true, soon: true },
      ]}
      actions={actions}
    />
  )
}
