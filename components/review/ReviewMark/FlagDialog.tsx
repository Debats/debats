'use client'

import { FormEvent, useState } from 'react'
import { Dialog } from 'radix-ui'
import { ReviewResult } from '../../../app/actions/review'
import {
  FLAG_REASONS,
  FlagReason,
  ReviewedEntityType,
} from '../../../domain/aggregates/review-events'
import { FLAG_REASON_LABELS, thisEntity } from '../../../domain/read-models/review'
import { NewFlag } from '../../../domain/use-cases/flag-entity'
import Button from '../../ui/Button'
import ChoiceCard from '../../ui/ChoiceCard'
import TextArea from '../../ui/TextArea'
import styles from './ReviewMark.module.css'

interface FlagDialogProps {
  entityType: ReviewedEntityType
  /** Distingue les champs de ce dialogue de ceux des autres marques de la page */
  fieldId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Envoie le signalement ; le dialogue se ferme s'il est accepté */
  onFlag: (flag: NewFlag) => Promise<ReviewResult>
}

/** Le signalement : un motif de la liste, et un commentaire qui le rend vérifiable. */
export default function FlagDialog({
  entityType,
  fieldId,
  open,
  onOpenChange,
  onFlag,
}: FlagDialogProps) {
  const [reason, setReason] = useState<FlagReason | ''>('')
  const [comment, setComment] = useState('')
  const [refused, setRefused] = useState<Extract<ReviewResult, { success: false }> | null>(null)
  const [sending, setSending] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSending(true)
    // A reason not chosen yet is sent as it is: the command names the field
    const result = await onFlag({ reason: reason as FlagReason, comment })
    setSending(false)
    if (!result.success) return setRefused(result)
    setRefused(null)
    setReason('')
    setComment('')
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.dialog}>
          <Dialog.Title className={styles.dialogTitle}>
            Signaler {thisEntity(entityType)}
          </Dialog.Title>
          <Dialog.Description className={styles.dialogNote}>
            Vous signalez une erreur dans ce qui est rapporté, pas un désaccord avec ce qui est dit.
          </Dialog.Description>

          <form className={styles.form} onSubmit={handleSubmit}>
            <fieldset className={styles.reasons}>
              <legend className={styles.legend}>Qu’est-ce qui ne va pas ?</legend>
              {FLAG_REASONS.map((value) => (
                <ChoiceCard
                  key={value}
                  checked={reason === value}
                  onChange={() => setReason(value)}
                >
                  {FLAG_REASON_LABELS[value]}
                </ChoiceCard>
              ))}
              {refused?.fields?.reason && (
                <p role="alert" className={styles.error}>
                  {refused.fields.reason}
                </p>
              )}
            </fieldset>

            <div>
              <TextArea
                label="Votre commentaire"
                id={`${fieldId}-comment`}
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                error={refused?.fields?.comment}
              />
              <p className={styles.dialogNote}>
                Dites ce qui ne va pas et, si possible, où le vérifier. Votre signalement est public
                et signé de votre nom.
              </p>
            </div>

            {refused?.error && (
              <p role="alert" className={styles.error}>
                {refused.error}
              </p>
            )}

            <div className={styles.dialogActions}>
              <Dialog.Close asChild>
                <button type="button" className={styles.quietAction}>
                  Annuler
                </button>
              </Dialog.Close>
              <Button type="submit" disabled={sending}>
                {sending ? 'Envoi…' : 'Envoyer le signalement'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
