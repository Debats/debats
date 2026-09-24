import { OrganisationType } from '../entities/organisation'

/** Read model for the /o index: an organisation with its current members count. */
export interface OrganisationSummary {
  id: string
  name: string
  slug: string
  acronym: string | null
  organisationType: OrganisationType
  presentation: string
  membersCount: number
}
