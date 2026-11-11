'use client'

import { useState, useCallback } from 'react'
import { createSubjectAction } from '../../../app/actions/create-subject'
import { subjectHref } from '../../../domain/read-models/hrefs'
import SubjectForm, { SubjectFormValues } from '../SubjectForm'
import FormSuccess from '../../ui/FormSuccess'

export default function NewSubjectForm() {
  const [successResult, setSuccessResult] = useState<{ slug: string; title: string }>()

  const handleSuccess = useCallback((result: { slug: string; title: string }) => {
    setSuccessResult(result)
  }, [])

  const handleSubmit = useCallback((values: SubjectFormValues) => createSubjectAction(values), [])

  if (successResult) {
    return (
      <FormSuccess
        title={`Le sujet « ${successResult.title} » a été créé !`}
        primaryAction={{
          label: 'Ajouter une première position',
          href: `${subjectHref(successResult.slug)}/nouvelle-position`,
        }}
        secondaryActions={[
          {
            label: 'Voir le sujet',
            href: subjectHref(successResult.slug),
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
      onSubmit={handleSubmit}
      submitLabel="Créer ce sujet"
      pendingLabel="Création en cours..."
      onSuccess={handleSuccess}
    />
  )
}
