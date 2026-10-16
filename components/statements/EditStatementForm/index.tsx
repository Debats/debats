'use client'

import { useCallback } from 'react'
import { updateStatementAction } from '../../../app/actions/update-statement'
import { ArgumentRef } from '../../../domain/read-models/argument'
import StatementForm from '../StatementForm'

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
  initialStatementType: string
  initialSourceName: string
  initialSourceUrl: string
  initialQuote: string
  initialStatedAt: string
}

export default function EditStatementForm({
  statementId,
  returnHref,
  positions,
  canUseArguments,
  initialArguments,
  initialPositionId,
  initialStatementType,
  initialSourceName,
  initialSourceUrl,
  initialQuote,
  initialStatedAt,
}: EditStatementFormProps) {
  const handleSubmit = useCallback(
    (formData: FormData) => updateStatementAction(statementId, formData),
    [statementId],
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
      initialStatementType={initialStatementType}
      initialSourceName={initialSourceName}
      initialSourceUrl={initialSourceUrl}
      initialQuote={initialQuote}
      initialStatedAt={initialStatedAt}
    />
  )
}
