'use client'

import ErrorDisplay from '../components/layout/ErrorDisplay'

export default function GlobalError() {
  return (
    <ErrorDisplay
      title="Erreur"
      message="Une erreur est survenue lors du chargement de cette page."
    />
  )
}
