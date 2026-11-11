'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrganisationAction } from '../../../app/actions/update-organisation'
import { organisationHref } from '../../../domain/read-models/hrefs'
import { editOrganisationForm, OrganisationFormInput } from '../../../lib/forms/organisation-form'
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
    async (values: OrganisationFormInput): Promise<SubmitOutcome> => {
      const formData = editOrganisationForm.encode({ ...values, revision })
      const result = await updateOrganisationAction(organisationId, formData)
      if (result.success) {
        router.push(organisationHref(result.slug))
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
      cancelHref={organisationHref(organisationSlug)}
      onSubmit={handleSubmit}
    />
  )
}
