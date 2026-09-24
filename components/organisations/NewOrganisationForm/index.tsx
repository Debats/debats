'use client'

import { useState, useCallback } from 'react'
import { createOrganisationAction } from '../../../app/actions/create-organisation'
import FormSuccess from '../../ui/FormSuccess'
import OrganisationForm, { SubmitOutcome } from '../OrganisationForm'

interface Created {
  slug: string
  name: string
}

export default function NewOrganisationForm() {
  const [created, setCreated] = useState<Created>()

  const handleSubmit = useCallback(async (formData: FormData): Promise<SubmitOutcome> => {
    const result = await createOrganisationAction(formData)
    if (result.success) {
      setCreated({ slug: result.slug, name: result.name })
      return { success: true }
    }
    return { success: false, error: result.error, fieldErrors: result.fieldErrors }
  }, [])

  if (created) {
    return (
      <FormSuccess
        title={`${created.name} a été ajoutée !`}
        primaryAction={{
          label: 'Affilier des personnalités',
          href: `/o/${created.slug}/affilier`,
        }}
        secondaryActions={[
          { label: `Voir la page de ${created.name}`, href: `/o/${created.slug}` },
          { label: 'Ajouter une autre organisation', onClick: () => setCreated(undefined) },
        ]}
      />
    )
  }

  return (
    <OrganisationForm
      submitLabel="Ajouter cette organisation"
      pendingLabel="Création en cours..."
      onSubmit={handleSubmit}
    />
  )
}
