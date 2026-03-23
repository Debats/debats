export type DraftStatement = {
  id: string
  quote: string
  sourceName: string
  sourceUrl: string
  date: string // YYYY-MM-DD
  aiNotes: string | null
  publicFigureName: string
  subjectTitle: string
  positionTitle: string
  publicFigureData: {
    presentation: string
    wikipediaUrl?: string
    notorietySources?: string[]
    websiteUrl?: string
  } | null
  subjectData: {
    presentation: string
    problem: string
  } | null
  positionData: {
    description: string
  } | null
  status: 'pending' | 'validated' | 'rejected'
  rejectionNote: string | null
  createdAt: Date
  updatedAt: Date
}
