'use client'

import { useCallback } from 'react'
import { updateStatementAction } from '../../../app/actions/update-statement'
import { ArgumentRef } from '../../../domain/read-models/argument'
import { ReviewDetail } from '../../../domain/read-models/review'
import { useReviewOnEdit } from '../../review/ReviewOnEdit/use-review-on-edit'
import { JointDeclarationRef } from '../../../domain/entities/joint-declaration'
import SignedJointlyNotice from '../SignedJointlyNotice'
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
  /** What readers said of the statement, when they confirmed or flagged it: the editor says what her edit makes of it */
  review: ReviewDetail | null
  /** The joint declaration the statement is a signature of: what it says is then the text's to change */
  signedWith?: JointDeclarationRef
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
  review,
  signedWith,
}: EditStatementFormProps) {
  const reviewed = useReviewOnEdit(review)
  const { correction } = reviewed
  const handleSubmit = useCallback(
    (formData: FormData) => updateStatementAction(statementId, formData, revision, correction),
    [statementId, revision, correction],
  )

  return (
    <>
      {signedWith && <SignedJointlyNotice declaration={signedWith} />}
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
        argumentsOnly={!!signedWith}
      >
        {reviewed.block}
      </StatementForm>
    </>
  )
}
