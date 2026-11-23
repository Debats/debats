'use client'

import { ReactNode, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import Button from '../../../../components/ui/Button'
import { JointDeclarationDraft } from '../../../../domain/read-models/joint-declaration-draft'
import { plural } from '../../../../lib/plural'
import {
  DeclarationReviewResult,
  rejectDraftedDeclarationAction,
  sendBackDraftedDeclarationAction,
  validateDraftedDeclarationAction,
} from '../../../actions/review-drafted-declaration'
import RejectForm from '../../drafts/RejectForm'
import DraftedPositionRow from './DraftedPositionRow'
import DraftedSignatoryRow from './DraftedSignatoryRow'
import styles from './DraftedDeclarationCard.module.css'

interface DraftedDeclarationCardProps {
  declaration: JointDeclarationDraft
  /** Les brouillons dont la déclaration est tirée, un par un, pour qui veut en amender ou en écarter un seul */
  children: ReactNode
}

/**
 * Une déclaration commune proposée par un chantier, lue comme un tout : le
 * texte, les positions qu'il prend, celles et ceux qui l'ont signé, déjà sur
 * le site ou à créer. Elle se valide d'un geste, ou se renvoie avec un
 * retour ; ses brouillons restent accessibles un par un.
 */
export default function DraftedDeclarationCard({
  declaration,
  children,
}: DraftedDeclarationCardProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string>()
  const [showReturnForm, setShowReturnForm] = useState(false)
  const { positions, signatories, items } = declaration
  const draftIds = items.map(({ draft }) => draft.id)

  /* Ce qui a été traité avant un refus le reste : la page relit dans tous les cas */
  const review = useCallback(
    async (action: () => Promise<DeclarationReviewResult>) => {
      setError(undefined)
      setIsPending(true)
      try {
        const result = await action()
        if (!result.success) {
          const stopped = items.find(({ draft }) => draft.id === result.stoppedAt)?.draft
          const where = stopped ? ` (${stopped.author.name} sur « ${stopped.subjectTitle} »)` : ''
          setError(
            `${result.settled} ${plural(result.settled, 'brouillon traité', 'brouillons traités')} sur ${items.length}, puis un refus${where} : ${result.error}`,
          )
        }
      } catch (err) {
        Sentry.captureException(err, { extra: { draftIds: items.map(({ draft }) => draft.id) } })
        setError('Une erreur inattendue est survenue.')
      }
      setIsPending(false)
      router.refresh()
    },
    [items, router],
  )

  return (
    <article className={styles.card}>
      <p className={styles.eyebrow}>Déclaration commune</p>
      <h3 className={styles.title}>{declaration.title}</h3>
      {declaration.presentation && <p className={styles.text}>{declaration.presentation}</p>}
      <p className={styles.meta}>
        <a
          className={styles.source}
          href={declaration.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {declaration.sourceName}
        </a>
        <span>{declaration.date}</span>
      </p>

      <h4 className={styles.heading}>
        {plural(positions.length, 'Position du texte', 'Positions du texte')}
        <span className={styles.count}>{positions.length}</span>
      </h4>
      <ul className={styles.positions}>
        {positions.map((position) => (
          <DraftedPositionRow
            key={`${position.subjectTitle} / ${position.positionTitle}`}
            position={position}
          />
        ))}
      </ul>

      <h4 className={styles.heading}>
        {plural(signatories.length, 'Signataire', 'Signataires')}
        <span className={styles.count}>{signatories.length}</span>
      </h4>
      <ul className={styles.signatories}>
        {signatories.map((signatory) => (
          <DraftedSignatoryRow
            key={`${signatory.author.kind} ${signatory.author.name}`}
            signatory={signatory}
          />
        ))}
      </ul>

      <p className={styles.text}>
        Valider référence le texte si le site ne le connaît pas, puis donne à chaque signataire une
        prise de position sur chacune des positions du texte, celles qu’il prenait déjà comprises.
      </p>

      <div className={styles.actions}>
        <Button
          size="small"
          onClick={() => void review(() => validateDraftedDeclarationAction(draftIds))}
          disabled={!declaration.canValidate || isPending}
        >
          {isPending ? 'Validation…' : 'Valider la déclaration commune'}
        </Button>
        <Button
          variant="secondary"
          size="small"
          onClick={() => setShowReturnForm(!showReturnForm)}
          disabled={isPending}
        >
          Faire un retour
        </Button>
      </div>

      {showReturnForm && (
        <RejectForm
          onReject={(note) => review(() => rejectDraftedDeclarationAction(draftIds, note))}
          onRequestRevision={(note) =>
            review(() => sendBackDraftedDeclarationAction(draftIds, note))
          }
          onCancel={() => setShowReturnForm(false)}
          disabled={isPending}
        />
      )}

      {error && <p className={styles.error}>{error}</p>}

      <details className={styles.drafts}>
        <summary className={styles.draftsSummary}>
          {`Relire ${items.length > 1 ? `les ${items.length} brouillons un par un` : 'le brouillon'}`}
        </summary>
        <div className={styles.draftsList}>{children}</div>
      </details>
    </article>
  )
}
