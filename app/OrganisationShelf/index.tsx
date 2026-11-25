import OrganisationCard from '../../components/organisations/OrganisationCard'
import { Shelf as Shelved } from '../../domain/read-models/home-page'
import { ORGANISATIONS_HREF } from '../../domain/read-models/hrefs'
import { OrganisationSummary } from '../../domain/read-models/organisation-summary'
import Shelf from '../Shelf'

/** Le rayon des organisations, sur l'accueil : les plus engagées dans le débat public. */
export default function OrganisationShelf({
  organisations,
}: {
  organisations: Shelved<OrganisationSummary>
}) {
  return (
    <Shelf
      title="Organisations"
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
