'use client'

import ErrorDisplay from '../../components/layout/ErrorDisplay'

export default function PersonalitiesError({ error }: { error: Error & { digest?: string } }) {
  return (
    <ErrorDisplay
      title="Erreur"
      message="Impossible de charger les personnalités."
      detail={error.message}
    />
  )
}
