'use client'

import ErrorDisplay from '../../../../components/layout/ErrorDisplay'

export default function EditSubjectError({ error }: { error: Error & { digest?: string } }) {
  return (
    <ErrorDisplay title="Erreur" message="Impossible de charger le sujet." detail={error.message} />
  )
}
