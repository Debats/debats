'use client'

import { FormEvent, useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '../../../../../components/ui/Button'
import ChoiceCard from '../../../../../components/ui/ChoiceCard'
import FormError from '../../../../../components/ui/FormError'
import TextArea from '../../../../../components/ui/TextArea'
import { ReviewedEntity, Settlement } from '../../../../../domain/aggregates/review'
import { FLAGS_HREF } from '../../../../../domain/read-models/hrefs'
import { settleFlagsAction, SettleFlagsResult } from '../../../../actions/settle-flags'
import styles from './SettleForm.module.css'

type Decision = 'correct' | Settlement

interface SettleFormProps {
  entity: ReviewedEntity
  /** La révision de la relecture que la page a montrée : un signalement arrivé depuis n'est pas clos sans être lu */
  revision: number
  /** Où l'entité se corrige, et ce que la correction y fera des signalements ; null si elle a quitté le site */
  correction: { href: string; note: string } | null
  /** L'entité peut quitter le site depuis ici : seule une prise de position en ligne le peut */
  removable: boolean
}

const SUBMIT_LABELS: Record<Settlement, string> = {
  dismissed: 'Écarter le signalement',
  removed: 'Retirer du site',
}

/**
 * La décision d'un·e modérateur·rice sur les signalements ouverts d'une
 * entité : corriger (par le formulaire de l'entité), écarter, ou retirer.
 * Écarter et retirer se répondent ici.
 */
export default function SettleForm({ entity, revision, correction, removable }: SettleFormProps) {
  const router = useRouter()
  const fieldId = useId()
  const [decision, setDecision] = useState<Decision>(correction ? 'correct' : 'dismissed')
  const [answer, setAnswer] = useState('')
  const [refused, setRefused] = useState<Extract<SettleFlagsResult, { success: false }> | null>(
    null,
  )
  const [sending, setSending] = useState(false)

  const choices: Array<{ value: Decision; label: string; note: string }> = [
    ...(correction
      ? [{ value: 'correct' as const, label: 'Corriger', note: correction.note }]
      : []),
    {
      value: 'dismissed',
      label: 'Écarter le signalement',
      note: 'Vous avez vérifié : le contenu est exact tel qu’il est. Rien ne change sur le site.',
    },
    ...(removable
      ? [
          {
            value: 'removed' as const,
            label: 'Retirer du site',
            note: 'Le contenu ne peut pas être sauvé : citation introuvable, doublon, hors sujet. Le retrait est définitif, et donne raison aux signalements.',
          },
        ]
      : []),
  ]

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (decision === 'correct') return
    setSending(true)
    const result = await settleFlagsAction(entity, { outcome: decision, answer, revision })
    if (!result.success) {
      setSending(false)
      return setRefused(result)
    }
    router.push(FLAGS_HREF)
    router.refresh()
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <fieldset className={styles.choices}>
        <legend className={styles.legend}>Que faire de ce signalement ?</legend>
        {choices.map(({ value, label, note }) => (
          <ChoiceCard
            key={value}
            note={note}
            checked={decision === value}
            onChange={() => setDecision(value)}
          >
            {label}
          </ChoiceCard>
        ))}
      </fieldset>

      {decision === 'correct' && correction ? (
        <div className={styles.actions}>
          <Button href={FLAGS_HREF} variant="link">
            Plus tard
          </Button>
          <Button href={correction.href}>Passer à la correction</Button>
        </div>
      ) : (
        <>
          <div>
            <TextArea
              label="Votre réponse"
              id={`${fieldId}-answer`}
              rows={3}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              error={refused?.fields?.answer}
            />
            <p className={styles.hint}>
              Dites ce que vous avez vérifié. Votre réponse reste attachée au signalement, signée de
              votre nom.
            </p>
          </div>
          {refused?.error && <FormError message={refused.error} />}
          <div className={styles.actions}>
            <Button href={FLAGS_HREF} variant="link">
              Plus tard
            </Button>
            <Button
              type="submit"
              variant={decision === 'removed' ? 'danger' : 'primary'}
              disabled={sending}
            >
              {sending ? 'Envoi…' : SUBMIT_LABELS[decision as Settlement]}
            </Button>
          </div>
        </>
      )}
    </form>
  )
}
