'use client'

import ErrorDisplay from '../../components/layout/ErrorDisplay'

export default function SubjectsError({ error }: { error: Error & { digest?: string } }) {
  return (
    <ErrorDisplay
      title="Erreur"
      message="Impossible de charger les sujets."
      detail={error.message}
    />
  )
}
