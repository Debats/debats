'use client'

import { useCallback } from 'react'
import { updateSubjectAction } from '../../../app/actions/update-subject'
import SubjectForm from '../SubjectForm'

interface EditSubjectFormProps {
  subjectId: string
  subjectSlug: string
  initialTitle: string
  initialPresentation: string
  initialProblem: string
}

export default function EditSubjectForm({
  subjectId,
  subjectSlug,
  initialTitle,
  initialPresentation,
  initialProblem,
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
      initialTitle={initialTitle}
      initialPresentation={initialPresentation}
      initialProblem={initialProblem}
    />
  )
}
