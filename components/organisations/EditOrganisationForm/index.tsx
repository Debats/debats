'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrganisationAction } from '../../../app/actions/update-organisation'
import OrganisationForm, { OrganisationFormValues, SubmitOutcome } from '../OrganisationForm'

interface EditOrganisationFormProps {
  organisationId: string
  organisationSlug: string
  initialValues: OrganisationFormValues
  /** The revision of the organisation's stream the form shows: an edit made meanwhile is not overwritten */
  revision: number
}

export default function EditOrganisationForm({
  organisationId,
  organisationSlug,
  initialValues,
  revision,
}: EditOrganisationFormProps) {
  const router = useRouter()

  const handleSubmit = useCallback(
    async (formData: FormData): Promise<SubmitOutcome> => {
      formData.set('revision', String(revision))
      const result = await updateOrganisationAction(organisationId, formData)
      if (result.success) {
        router.push(`/o/${result.slug}`)
        return { success: true }
      }
      return { success: false, error: result.error, fieldErrors: result.fieldErrors }
    },
    [organisationId, revision, router],
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
