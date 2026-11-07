import { OrganisationSummary } from '../../../domain/read-models/organisation-summary'
import OrganisationCard from '../OrganisationCard'
import styles from './OrganisationGrid.module.css'

interface OrganisationGridProps {
  organisations: OrganisationSummary[]
}

/** Les cartes d'organisations sur deux colonnes, dans l'ordre reçu. */
export default function OrganisationGrid({ organisations }: OrganisationGridProps) {
  if (organisations.length === 0) return null

  return (
    <div className={styles.grid}>
      {organisations.map((organisation) => (
        <OrganisationCard key={organisation.id} organisation={organisation} />
      ))}
    </div>
  )
}
