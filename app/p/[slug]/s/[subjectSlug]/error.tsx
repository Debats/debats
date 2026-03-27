'use client'

import ErrorDisplay from '../../../../../components/layout/ErrorDisplay'

export default function FigureSubjectError({ error }: { error: Error & { digest?: string } }) {
  return (
    <ErrorDisplay
      title="Erreur"
      message="Impossible de charger les prises de position."
      detail={error.message}
    />
  )
}
