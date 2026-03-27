'use client'

import ErrorDisplay from '../components/layout/ErrorDisplay'

export default function HomeError({ error }: { error: Error & { digest?: string } }) {
  return (
    <ErrorDisplay
      title="Erreur"
      message="Impossible de charger la page d'accueil."
      detail={error.message}
    />
  )
}
