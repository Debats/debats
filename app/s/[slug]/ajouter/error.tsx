'use client'

import ErrorDisplay from '../../../../components/layout/ErrorDisplay'

export default function AddStatementError({ error }: { error: Error & { digest?: string } }) {
  return (
    <ErrorDisplay
      title="Erreur"
      message="Impossible de charger le formulaire."
      detail={error.message}
    />
  )
}
