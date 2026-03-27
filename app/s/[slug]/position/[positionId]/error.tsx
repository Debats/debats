'use client'

import ErrorDisplay from '../../../../../components/layout/ErrorDisplay'

export default function PositionDetailError({ error }: { error: Error & { digest?: string } }) {
  return (
    <ErrorDisplay
      title="Erreur"
      message="Impossible de charger la position."
      detail={error.message}
    />
  )
}
