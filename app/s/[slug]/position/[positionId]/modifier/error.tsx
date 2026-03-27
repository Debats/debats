'use client'

import ErrorDisplay from '../../../../../../components/layout/ErrorDisplay'

export default function EditPositionError({ error }: { error: Error & { digest?: string } }) {
  return (
    <ErrorDisplay
      title="Erreur"
      message="Impossible de charger la position."
      detail={error.message}
    />
  )
}
