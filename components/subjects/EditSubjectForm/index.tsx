'use client'

import { useCallback } from 'react'
import { updateSubjectAction } from '../../../app/actions/update-subject'
import SubjectForm, { SubjectFormValues } from '../SubjectForm'

interface EditSubjectFormProps {
  subjectId: string
  subjectSlug: string
  subject: SubjectFormValues
}

export default function EditSubjectForm({ subjectId, subjectSlug, subject }: EditSubjectFormProps) {
  const handleSubmit = useCallback(
    (formData: FormData) => updateSubjectAction(subjectId, formData),
    [subjectId],
  )

  return (
    <SubjectForm
      onSubmit={handleSubmit}
      submitLabel="Enregistrer les modifications"
      pendingLabel="Enregistrement..."
      cancelHref={`/s/${subjectSlug}`}
      subject={subject}
    />
  )
}
