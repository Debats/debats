'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrganisationAction } from '../../../app/actions/update-organisation'
import { organisationHref } from '../../../domain/read-models/hrefs'
import { ReviewDetail } from '../../../domain/read-models/review'
import { editOrganisationForm, OrganisationFormInput } from '../../../lib/forms/organisation-form'
import { useReviewOnEdit } from '../../review/ReviewOnEdit/use-review-on-edit'
import OrganisationForm, { OrganisationFormValues, SubmitOutcome } from '../OrganisationForm'

interface EditOrganisationFormProps {
  organisationId: string
  organisationSlug: string
  initialValues: OrganisationFormValues
  /** The revision of the organisation's stream the form shows: an edit made meanwhile is not overwritten */
  revision: number
  /** What readers said of the organisation, when they confirmed or flagged it: the editor says what her edit makes of it */
  review: ReviewDetail | null
}

export default function EditOrganisationForm({
  organisationId,
  organisationSlug,
  initialValues,
  revision,
  review,
}: EditOrganisationFormProps) {
  const router = useRouter()
  const reviewed = useReviewOnEdit(review)
  const { correction } = reviewed

  const handleSubmit = useCallback(
    async (values: OrganisationFormInput): Promise<SubmitOutcome> => {
      const formData = editOrganisationForm.encode({ ...values, revision })
      const result = await updateOrganisationAction(organisationId, formData, correction)
      if (result.success) {
        router.push(organisationHref(result.slug))
        return { success: true }
      }
      return { success: false, error: result.error, fieldErrors: result.fieldErrors }
    },
    [organisationId, revision, correction, router],
  )

  return (
    <OrganisationForm
      initialValues={initialValues}
      currentSlug={organisationSlug}
      submitLabel="Enregistrer les modifications"
      pendingLabel="Enregistrement..."
      cancelHref={organisationHref(organisationSlug)}
      onSubmit={handleSubmit}
    >
      {reviewed.block}
    </OrganisationForm>
  )
}
