'use client'

import { useCallback } from 'react'
import { updateSubjectAction } from '../../../app/actions/update-subject'
import { subjectHref } from '../../../domain/read-models/hrefs'
import SubjectForm, { SubjectFormValues } from '../SubjectForm'

interface EditSubjectFormProps {
  subjectId: string
  subjectSlug: string
  subject: SubjectFormValues
  /** The revision of the subject's stream the form shows: an edit made meanwhile is not overwritten */
  revision: number
}

export default function EditSubjectForm({
  subjectId,
  subjectSlug,
  subject,
  revision,
}: EditSubjectFormProps) {
  const handleSubmit = useCallback(
    (values: SubjectFormValues) => updateSubjectAction(subjectId, { ...values, revision }),
    [subjectId, revision],
  )

  return (
    <SubjectForm
      onSubmit={handleSubmit}
      submitLabel="Enregistrer les modifications"
      pendingLabel="Enregistrement..."
      cancelHref={subjectHref(subjectSlug)}
      subject={subject}
    />
  )
}
