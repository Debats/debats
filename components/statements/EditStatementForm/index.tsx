'use client'

import { useCallback } from 'react'
import { updateStatementAction } from '../../../app/actions/update-statement'
import { ArgumentRef } from '../../../domain/read-models/argument'
import StatementForm from '../StatementForm'
import { StatementContentInput } from '../../../domain/use-cases/validate-statement-fields'

interface PositionOption {
  id: string
  title: string
}

interface EditStatementFormProps {
  statementId: string
  returnHref: string
  positions: PositionOption[]
  canUseArguments: boolean
  initialArguments: ArgumentRef[]
  initialPositionId: string
  initialContent: StatementContentInput
  initialSourceName: string
  initialSourceUrl: string
  initialStatedAt: string
  /** The revision of the statement's stream the form shows: an edit made meanwhile is not overwritten */
  revision: number
}

export default function EditStatementForm({
  statementId,
  returnHref,
  positions,
  canUseArguments,
  initialArguments,
  initialPositionId,
  initialContent,
  initialSourceName,
  initialSourceUrl,
  initialStatedAt,
  revision,
}: EditStatementFormProps) {
  const handleSubmit = useCallback(
    (formData: FormData) => {
      formData.set('revision', String(revision))
      return updateStatementAction(statementId, formData)
    },
    [statementId, revision],
  )

  return (
    <StatementForm
      onSubmit={handleSubmit}
      submitLabel="Enregistrer les modifications"
      pendingLabel="Enregistrement..."
      redirectTo={returnHref}
      cancelHref={returnHref}
      positions={positions}
      canUseArguments={canUseArguments}
      initialArguments={initialArguments}
      initialPositionId={initialPositionId}
      initialContent={initialContent}
      initialSourceName={initialSourceName}
      initialSourceUrl={initialSourceUrl}
      initialStatedAt={initialStatedAt}
    />
  )
}
