'use client'

import ErrorDisplay from '../../../../../../../components/layout/ErrorDisplay'

export default function EditStatementError({ error }: { error: Error & { digest?: string } }) {
  return (
    <ErrorDisplay
      title="Erreur"
      message="Impossible de charger la prise de position."
      detail={error.message}
    />
  )
}
