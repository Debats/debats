import { OrganisationType } from '../entities/organisation'

/** Read model for the /o index: an organisation with its activity counters. */
export interface OrganisationSummary {
  id: string
  name: string
  slug: string
  acronym: string | null
  organisationType: OrganisationType
  presentation: string
  /** Public figures currently affiliated */
  membersCount: number
  /** Statements made by the organisation itself */
  statementsCount: number
  subjectsCount: number
}
