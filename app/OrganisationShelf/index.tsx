import OrganisationCard from '../../components/organisations/OrganisationCard'
import { Glimpse } from '../../domain/read-models/home-page'
import { ORGANISATIONS_HREF } from '../../domain/read-models/hrefs'
import { OrganisationSummary } from '../../domain/read-models/organisation-summary'
import Shelf from '../Shelf'

/** Le rayon des organisations, sur l'accueil : celles qui se sont exprimées sur le plus de sujets ces trente derniers jours. */
export default function OrganisationShelf({
  organisations,
}: {
  organisations: Glimpse<OrganisationSummary>
}) {
  return (
    <Shelf
      title="Organisations les plus actives"
      total={organisations.total}
      more={{ href: ORGANISATIONS_HREF, label: 'Toutes les organisations' }}
      columnMin={340}
    >
      {organisations.shown.map((organisation) => (
        <OrganisationCard key={organisation.id} organisation={organisation} />
      ))}
    </Shelf>
  )
}
