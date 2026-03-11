'use client'

import { useState, useCallback } from 'react'
import { createSubjectAction } from '../../../app/actions/create-subject'
import SubjectForm from '../SubjectForm'
import FormSuccess from '../../ui/FormSuccess'

export default function NewSubjectForm() {
  const [successResult, setSuccessResult] = useState<{ slug: string; title: string }>()

  const handleSuccess = useCallback((result: { slug: string; title: string }) => {
    setSuccessResult(result)
  }, [])

  if (successResult) {
    return (
      <FormSuccess
        title={`Le sujet « ${successResult.title} » a été créé !`}
        primaryAction={{
          label: 'Ajouter une première position',
          href: `/s/${successResult.slug}/nouvelle-position`,
        }}
        secondaryActions={[
          {
            label: 'Voir le sujet',
            href: `/s/${successResult.slug}`,
          },
          {
            label: 'Créer un autre sujet',
            onClick: () => setSuccessResult(undefined),
          },
        ]}
      />
    )
  }

  return (
    <SubjectForm
      onSubmit={createSubjectAction}
      submitLabel="Créer ce sujet"
      pendingLabel="Création en cours..."
      onSuccess={handleSuccess}
    />
  )
}
