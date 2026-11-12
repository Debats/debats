'use client'

import { useId, useState } from 'react'
import { Popover } from 'radix-ui'
import { reviewDetailAction, ReviewResult } from '../../../app/actions/review'
import { ReviewedEntity } from '../../../domain/aggregates/review'
import {
  markLabel,
  ReviewDetail,
  ReviewMark as Mark,
  Viewer,
} from '../../../domain/read-models/review'
import LoginModal from '../../auth/LoginModal'
import FlagDialog from './FlagDialog'
import Glyph from './Glyph'
import QuickActions from './QuickActions'
import ReviewPanel from './ReviewPanel'
import { useReview } from './use-review'
import styles from './ReviewMark.module.css'

interface ReviewMarkProps {
  entity: ReviewedEntity
  mark: Mark
  viewer: Viewer
}

/**
 * La marque de vérification d'une entité : une coche et le nombre de
 * lecteur·rices qui l'ont confirmée, un drapeau et le nombre de signalements
 * en cours. Au repos elle ne demande rien à qui lit ; elle ouvre le détail,
 * et ce que chacun·e peut y faire.
 */
export default function ReviewMark({ entity, mark: initial, viewer }: ReviewMarkProps) {
  const review = useReview(entity, initial)
  const { mark } = review
  const fieldId = useId()
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<ReviewDetail | null>(null)
  const [flagging, setFlagging] = useState(false)
  const [signingIn, setSigningIn] = useState(false)

  /** The detail is read when asked for, and again after each word of the viewer's */
  async function readDetail() {
    setDetail(await reviewDetailAction(entity))
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) void readDetail()
  }

  /**
   * One of the viewer's own words: the mark follows, and the detail if it is
   * shown. A word refused opens the detail, where the refusal is told: a
   * one-click gesture never fails without a word.
   */
  async function say(word: () => Promise<ReviewResult>) {
    const result = await word()
    if (!result.success) return handleOpenChange(true)
    if (open) await readDetail()
  }

  function startFlagging() {
    setOpen(false)
    setFlagging(true)
  }

  return (
    <span className={styles.mark}>
      {viewer !== 'visitor' && (
        <QuickActions
          entityType={entity.type}
          mark={mark}
          busy={review.busy}
          onConfirm={() => say(review.confirm)}
          onWithdrawConfirmation={() => say(review.withdrawConfirmation)}
          onFlag={startFlagging}
        />
      )}

      <Popover.Root open={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={styles.rest}
            aria-label={`${markLabel(entity.type, mark)}, voir le détail`}
          >
            <span
              className={[
                styles.count,
                mark.confirmations === 0 ? styles.none : '',
                mark.confirmedByViewer ? styles.mine : '',
              ].join(' ')}
            >
              <Glyph shape="check" />
              {mark.confirmations > 0 && mark.confirmations}
            </span>
            <span
              className={`${styles.count} ${mark.openFlags > 0 ? styles.flagged : styles.none}`}
            >
              <Glyph shape="flag" size={12} />
              {mark.openFlags > 0 && mark.openFlags}
            </span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className={styles.panel}
            align="end"
            sideOffset={6}
            collisionPadding={12}
          >
            <ReviewPanel
              entityType={entity.type}
              mark={mark}
              detail={detail}
              viewer={viewer}
              busy={review.busy}
              error={review.error}
              onConfirm={() => say(review.confirm)}
              onWithdrawConfirmation={() => say(review.withdrawConfirmation)}
              onFlag={startFlagging}
              onWithdrawFlag={() => say(review.withdrawFlag)}
              onSignIn={() => {
                setOpen(false)
                setSigningIn(true)
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <FlagDialog
        entityType={entity.type}
        fieldId={fieldId}
        open={flagging}
        onOpenChange={setFlagging}
        onFlag={review.flag}
      />
      {signingIn && <LoginModal onClose={() => setSigningIn(false)} />}
    </span>
  )
}
