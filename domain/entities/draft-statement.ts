import { OrganisationType } from './organisation'
import { StatementContent } from './statement'

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

/** An argument the statement mobilises; the title is global to the whole site. */
export type DraftArgument = {
  title: string
  description?: string
}

/**
 * An occupation of the public figure author, from the closed list.
 * A former occupation is marked `current: false`.
 */
export type DraftOccupation = {
  name: string
  current: boolean
}

/**
 * An organisation the public figure author belongs to.
 * `organisationData` is only needed when the organisation does not exist yet,
 * and no end date means the affiliation is still current.
 */
export type DraftAffiliation = {
  organisation: string
  organisationData?: DraftOrganisationData
  role?: string
  startedOn?: string
  endedOn?: string
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

export type DraftStatus = 'pending' | 'validated' | 'rejected' | 'revision_requested'

/** What a validation may create rather than reuse */
export type CreatedByValidation = 'subject' | 'position' | 'public_figure' | 'organisation'

/** What validating the draft did on the site: the statement, and what had to be created for it */
export type DraftValidation = {
  statementId: string
  created: CreatedByValidation[]
}

/** How what a validation created reads, as a verb phrase: « a créé le sujet et la personnalité » */
export function createdPhrase(created: CreatedByValidation[]): string {
  const names: Record<CreatedByValidation, string> = {
    subject: 'le sujet',
    position: 'la position',
    public_figure: 'la personnalité',
    organisation: 'l’organisation',
  }
  if (created.length === 0) return 'n’a rien eu à créer'
  const listed = created.map((kind) => names[kind])
  const joined =
    listed.length === 1 ? listed[0] : `${listed.slice(0, -1).join(', ')} et ${listed.at(-1)}`
  return `a créé ${joined}`
}

/** How each status reads on screen */
export const DRAFT_STATUS_LABELS: Record<DraftStatus, string> = {
  pending: 'À relire',
  validated: 'Validé',
  rejected: 'Rejeté',
  revision_requested: 'Renvoyé en révision',
}

export type DraftStatement = {
  id: string
  author: DraftAuthor
  /**
   * What the draft carries, in the same shape a statement does: the words of a
   * declaration or a programme, the ballot of a vote, the deed of an act.
   */
  content: StatementContent
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
  /** Arguments the statement mobilises, empty when it only asserts */
  arguments: DraftArgument[]
  /** Occupations of the public figure author, empty for an organisation */
  occupations: DraftOccupation[]
  /** Organisations the public figure author belongs to, empty for an organisation */
  affiliations: DraftAffiliation[]
  origin: string
  /** The chantier this draft was produced in, when it was */
  chantierId: string | null
  status: DraftStatus
  rejectionNote: string | null
  /** What validating the draft did, once it is validated */
  validation: DraftValidation | null
  createdAt: Date
  updatedAt: Date
}
