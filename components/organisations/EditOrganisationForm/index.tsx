'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrganisationAction } from '../../../app/actions/update-organisation'
import OrganisationForm, { OrganisationFormValues, SubmitOutcome } from '../OrganisationForm'

interface EditOrganisationFormProps {
  organisationId: string
  organisationSlug: string
  initialValues: OrganisationFormValues
}

export default function EditOrganisationForm({
  organisationId,
  organisationSlug,
  initialValues,
}: EditOrganisationFormProps) {
  const router = useRouter()

  const handleSubmit = useCallback(
    async (formData: FormData): Promise<SubmitOutcome> => {
      const result = await updateOrganisationAction(organisationId, formData)
      if (result.success) {
        router.push(`/o/${result.slug}`)
        return { success: true }
      }
      return { success: false, error: result.error, fieldErrors: result.fieldErrors }
    },
    [organisationId, router],
  )

  return (
    <OrganisationForm
      initialValues={initialValues}
      currentSlug={organisationSlug}
      submitLabel="Enregistrer les modifications"
      pendingLabel="Enregistrement..."
      cancelHref={`/o/${organisationSlug}`}
      onSubmit={handleSubmit}
    />
  )
}
