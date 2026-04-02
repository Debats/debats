'use client'

import { useCallback } from 'react'
import { updateSubjectAction } from '../../../app/actions/update-subject'
import SubjectForm, { SubjectFormValues } from '../SubjectForm'
import { ThemeOption } from '../../ui/ThemeSelector'

interface EditSubjectFormProps {
  subjectId: string
  subjectSlug: string
  subject: SubjectFormValues
  availableThemes: ThemeOption[]
}

export default function EditSubjectForm({
  subjectId,
  subjectSlug,
  subject,
  availableThemes,
}: EditSubjectFormProps) {
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
      availableThemes={availableThemes}
    />
  )
}
