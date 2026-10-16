import { StatementType } from '../entities/statement'
import { StatementAuthorRef } from './statement-author'

/** La prise de position la plus récente d'une position, mise en avant sur la page sujet */
export interface PositionLatestStatement {
  id: string
  quote: string
  statedAt: Date
  sourceName: string
  sourceUrl: string | null
  statementType: StatementType
  author: StatementAuthorRef
}

export interface PositionSummary {
  positionId: string
  positionTitle: string
  positionSlug: string
  positionDescription: string
  totalFiguresCount: number
  totalOrganisationsCount: number
  /** Up to the requested limit of each kind */
  figures: StatementAuthorRef[]
  organisations: StatementAuthorRef[]
  latestStatement: PositionLatestStatement | null
}

/** Everyone who took this position: public figures first, then organisations */
export const positionAuthors = (position: PositionSummary): StatementAuthorRef[] => [
  ...position.figures,
  ...position.organisations,
]

export const positionAuthorsCount = (position: PositionSummary): number =>
  position.totalFiguresCount + position.totalOrganisationsCount
