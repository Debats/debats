'use client'

import { useCallback } from 'react'
import { createStatementAction } from '../../../app/actions/create-statement'
import { searchPublicFigures } from '../../../app/actions/search-public-figures'
import StatementForm from '../StatementForm'

interface PositionOption {
  id: string
  title: string
}

interface AddStatementFormProps {
  subjectId: string
  slug: string
  positions: PositionOption[]
}

export default function AddStatementForm({ subjectId, slug, positions }: AddStatementFormProps) {
  const handleSubmit = useCallback(
    (formData: FormData) => createStatementAction(subjectId, slug, formData),
    [subjectId, slug],
  )

  const handleSearchFigures = useCallback(async (query: string) => {
    const results = await searchPublicFigures(query)
    return results.map((f) => ({ id: f.id, label: f.name }))
  }, [])

  return (
    <StatementForm
      onSubmit={handleSubmit}
      submitLabel="Ajouter cette prise de position"
      pendingLabel="Ajout en cours..."
      redirectTo={`/s/${slug}`}
      positions={positions}
      onSearchFigures={handleSearchFigures}
    />
  )
}
