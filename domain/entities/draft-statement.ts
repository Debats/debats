import { OrganisationType } from './organisation'
import { StatementType } from './statement'

/** Fields needed to create a public figure that does not exist yet. */
export type DraftPublicFigureData = {
  presentation: string
  wikipediaUrl?: string
  notorietySources?: string[]
  websiteUrl?: string
}

/** Fields needed to create an organisation that does not exist yet. */
export type DraftOrganisationData = {
  presentation: string
  organisationType: OrganisationType
  acronym?: string
  wikipediaUrl?: string
  notorietySources?: string[]
  websiteUrl?: string
}

/**
 * Who takes position in the draft: a public figure or an organisation, never both.
 * `data` is only needed when the entity does not exist yet.
 */
export type DraftAuthor =
  | { kind: 'public_figure'; name: string; data: DraftPublicFigureData | null }
  | { kind: 'organisation'; name: string; data: DraftOrganisationData | null }

export const draftPublicFigureAuthor = (
  name: string,
  data: DraftPublicFigureData | null = null,
): DraftAuthor => ({ kind: 'public_figure', name, data })

export const draftOrganisationAuthor = (
  name: string,
  data: DraftOrganisationData | null = null,
): DraftAuthor => ({ kind: 'organisation', name, data })

export type DraftStatement = {
  id: string
  author: DraftAuthor
  statementType: StatementType
  quote: string
  sourceName: string
  sourceUrl: string
  date: string // YYYY-MM-DD
  aiNotes: string | null
  subjectTitle: string
  positionTitle: string
  subjectData: {
    presentation: string
    problem: string
  } | null
  positionData: {
    description: string
  } | null
  origin: string
  status: 'pending' | 'validated' | 'rejected' | 'revision_requested'
  rejectionNote: string | null
  createdAt: Date
  updatedAt: Date
}
