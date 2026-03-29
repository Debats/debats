'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { DraftStatement } from '../../../../domain/entities/draft-statement'
import { DraftResolution } from '../../../../domain/use-cases/resolve-draft'
import { validateDraftAction, ActionResult } from '../../../actions/validate-draft-action'
import { rejectDraftAction, requestRevisionAction } from '../../../actions/reject-draft-action'
import {
  amendAndValidateDraftAction,
  DraftAmendments,
} from '../../../actions/amend-and-validate-draft-action'
import { deleteDraftAction } from '../../../actions/delete-draft-action'
import Button from '../../../../components/ui/Button'
import EntityStatus from '../EntityStatus'
import CreationPreview from '../CreationPreview'
import RejectForm from '../RejectForm'
import DraftAmendForm from '../DraftAmendForm'
import styles from './DraftCard.module.css'

interface DraftCardProps {
  draft: DraftStatement
  resolution: DraftResolution
}

export default function DraftCard({ draft, resolution }: DraftCardProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string>()
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [showAmendForm, setShowAmendForm] = useState(false)

  const executeAction = useCallback(
    async (action: () => Promise<ActionResult>) => {
      setError(undefined)
      setIsPending(true)

      try {
        const result = await action()
        if (!result.success) {
          setError(result.error)
          setIsPending(false)
        } else {
          router.refresh()
        }
      } catch (err) {
        Sentry.captureException(err, { extra: { draftId: draft.id } })
        setError('Une erreur inattendue est survenue.')
        setIsPending(false)
      }
    },
    [draft.id, router],
  )

  const handleValidate = useCallback(
    () => executeAction(() => validateDraftAction(draft.id)),
    [draft.id, executeAction],
  )

  const handleReject = useCallback(
    (note: string) => executeAction(() => rejectDraftAction(draft.id, note)),
    [draft.id, executeAction],
  )

  const handleRequestRevision = useCallback(
    (note: string) => executeAction(() => requestRevisionAction(draft.id, note)),
    [draft.id, executeAction],
  )

  const handleAmendAndValidate = useCallback(
    (amendments: DraftAmendments) =>
      executeAction(() => amendAndValidateDraftAction(draft.id, amendments)),
    [draft.id, executeAction],
  )

  const handleDelete = useCallback(
    () => executeAction(() => deleteDraftAction(draft.id)),
    [draft.id, executeAction],
  )

  return (
    <div className={styles.card}>
      <blockquote className={styles.quote}>{draft.quote}</blockquote>

      <div className={styles.meta}>
        <a
          className={styles.source}
          href={draft.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {draft.sourceName}
        </a>
        <span className={styles.date}>{draft.date}</span>
        {draft.origin && <span className={styles.origin}>{draft.origin}</span>}
      </div>

      {draft.aiNotes && <p className={styles.aiNotes}>{draft.aiNotes}</p>}

      <div className={styles.resolution}>
        <EntityStatus
          label={draft.publicFigureName}
          resolution={resolution.publicFigure}
          linkPrefix="/p/"
        />
        <EntityStatus label={draft.subjectTitle} resolution={resolution.subject} linkPrefix="/s/" />
        <EntityStatus label={draft.positionTitle} resolution={resolution.position} />
      </div>

      {draft.publicFigureData && !resolution.publicFigure.found && (
        <CreationPreview title={draft.publicFigureName}>
          <p>{draft.publicFigureData.presentation}</p>
          {draft.publicFigureData.wikipediaUrl && (
            <p>
              <strong>Wikipedia :</strong>{' '}
              <a
                href={draft.publicFigureData.wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {draft.publicFigureData.wikipediaUrl}
              </a>
            </p>
          )}
          {draft.publicFigureData.notorietySources &&
            draft.publicFigureData.notorietySources.length > 0 && (
              <>
                <p>
                  <strong>Sources de notoriété :</strong>
                </p>
                <ul className={styles.notorietySources}>
                  {draft.publicFigureData.notorietySources.map((url, index) => (
                    <li key={index}>
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
        </CreationPreview>
      )}

      {draft.subjectData && !resolution.subject.found && (
        <CreationPreview title={draft.subjectTitle}>
          <p>{draft.subjectData.presentation}</p>
          <p>
            <strong>Problématique :</strong> {draft.subjectData.problem}
          </p>
        </CreationPreview>
      )}

      {draft.positionData && !resolution.position.found && (
        <CreationPreview title={draft.positionTitle}>
          <p>{draft.positionData.description}</p>
        </CreationPreview>
      )}

      <div className={styles.actions}>
        <Button
          size="small"
          onClick={handleValidate}
          disabled={!resolution.canValidate || isPending}
        >
          {isPending ? 'Validation…' : 'Valider'}
        </Button>
        <Button
          variant="secondary"
          size="small"
          onClick={() => {
            setShowAmendForm(!showAmendForm)
            setShowRejectForm(false)
          }}
          disabled={isPending}
        >
          Amender
        </Button>
        <Button
          variant="secondary"
          size="small"
          onClick={() => {
            setShowRejectForm(!showRejectForm)
            setShowAmendForm(false)
          }}
          disabled={isPending}
        >
          Rejeter
        </Button>
        <Button variant="danger" size="small" onClick={handleDelete} disabled={isPending}>
          Supprimer
        </Button>
      </div>

      {showAmendForm && (
        <DraftAmendForm
          draft={draft}
          resolution={resolution}
          onSubmit={handleAmendAndValidate}
          onCancel={() => setShowAmendForm(false)}
          disabled={isPending}
        />
      )}

      {showRejectForm && (
        <RejectForm
          onReject={handleReject}
          onRequestRevision={handleRequestRevision}
          onCancel={() => setShowRejectForm(false)}
          disabled={isPending}
        />
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
