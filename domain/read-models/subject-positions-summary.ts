import { StatementType } from '../entities/statement'

export interface PositionFigure {
  id: string
  name: string
  slug: string
}

/** La prise de position la plus récente d'une position, mise en avant sur la page sujet */
export interface PositionLatestStatement {
  id: string
  quote: string
  statedAt: Date
  sourceName: string
  sourceUrl: string | null
  statementType: StatementType
  figure: PositionFigure
}

export interface PositionSummary {
  positionId: string
  positionTitle: string
  positionSlug: string
  positionDescription: string
  totalFiguresCount: number
  figures: PositionFigure[]
  latestStatement: PositionLatestStatement | null
}
