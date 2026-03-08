'use client'

import { createSubjectAction } from '../../../app/actions/create-subject'
import SubjectForm from '../SubjectForm'

export default function NewSubjectForm() {
  return (
    <SubjectForm
      onSubmit={createSubjectAction}
      submitLabel="Créer ce sujet"
      pendingLabel="Création en cours..."
    />
  )
}
