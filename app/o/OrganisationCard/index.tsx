import Link from 'next/link'
import OrganisationLogo from '../../../components/organisations/OrganisationLogo'
import { OrganisationSummary } from '../../../domain/read-models/organisation-summary'
import { plural } from '../../../lib/plural'
import styles from './OrganisationCard.module.css'

interface OrganisationCardProps {
  organisation: OrganisationSummary
}

/** Carte d'une organisation dans l'index : logo, nom, présentation, membres. */
export default function OrganisationCard({ organisation }: OrganisationCardProps) {
  return (
    <Link href={`/o/${organisation.slug}`} className={styles.card}>
      <OrganisationLogo
        slug={organisation.slug}
        name={organisation.name}
        acronym={organisation.acronym}
        size={56}
      />
      <span className={styles.body}>
        <span className={styles.name}>
          {organisation.name}
          {organisation.acronym && <span className={styles.acronym}>{organisation.acronym}</span>}
        </span>
        <span className={styles.presentation}>{organisation.presentation}</span>
        <span className={styles.meta}>
          {organisation.statementsCount}{' '}
          {plural(organisation.statementsCount, 'prise de position', 'prises de position')} ·{' '}
          {organisation.membersCount}{' '}
          {plural(organisation.membersCount, 'personnalité affiliée', 'personnalités affiliées')}
        </span>
      </span>
    </Link>
  )
}
