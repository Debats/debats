export interface PositionSummary {
  positionId: string
  positionTitle: string
  positionDescription: string
  totalFiguresCount: number
  figures: Array<{ id: string; name: string; slug: string }>
}
