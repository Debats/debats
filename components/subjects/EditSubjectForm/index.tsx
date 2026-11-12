'use client'

import { useCallback } from 'react'
import { updateSubjectAction } from '../../../app/actions/update-subject'
import { subjectHref } from '../../../domain/read-models/hrefs'
import { ReviewDetail } from '../../../domain/read-models/review'
import { useReviewOnEdit } from '../../review/ReviewOnEdit/use-review-on-edit'
import SubjectForm, { SubjectFormValues } from '../SubjectForm'

interface EditSubjectFormProps {
  subjectId: string
  subjectSlug: string
  subject: SubjectFormValues
  /** The revision of the subject's stream the form shows: an edit made meanwhile is not overwritten */
  revision: number
  /** What readers said of the subject, when they confirmed or flagged it: the editor says what her edit makes of it */
  review: ReviewDetail | null
}

export default function EditSubjectForm({
  subjectId,
  subjectSlug,
  subject,
  revision,
  review,
}: EditSubjectFormProps) {
  const reviewed = useReviewOnEdit(review)
  const { correction } = reviewed
  const handleSubmit = useCallback(
    (values: SubjectFormValues) =>
      updateSubjectAction(subjectId, { ...values, revision, review: correction }),
    [subjectId, revision, correction],
  )

  return (
    <SubjectForm
      onSubmit={handleSubmit}
      submitLabel="Enregistrer les modifications"
      pendingLabel="Enregistrement..."
      cancelHref={subjectHref(subjectSlug)}
      subject={subject}
    >
      {reviewed.block}
    </SubjectForm>
  )
}
