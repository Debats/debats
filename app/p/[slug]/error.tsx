'use client'

import ErrorDisplay from '../../../components/layout/ErrorDisplay'

export default function PersonalityError({ error }: { error: Error & { digest?: string } }) {
  return (
    <ErrorDisplay
      title="Erreur"
      message="Impossible de charger la personnalité."
      detail={error.message}
    />
  )
}
