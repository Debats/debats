'use client'

import {
  Chantier,
  CHANTIER_STATUS_LABELS,
  ChantierMessage,
} from '../../../../domain/entities/chantier'
import { withoutTitleLine } from '../../../../domain/services/chantier-title'
import Composer from '../../../../components/ui/Composer'
import ConfirmAction from '../../../../components/ui/ConfirmAction'
import DialogueSheet, { Sheet } from '../../../../components/ui/DialogueSheet'
import styles from './ChantierDialogue.module.css'

interface ChantierDialogueProps {
  chantier: Chantier
  messages: ChantierMessage[]
  sheet: Sheet
  onSheet: (sheet: Sheet) => void
  onSend: (text: string) => void
  onClose: () => void
  /** Deletes the chantier for good; rejects with the reason when it cannot */
  onDelete: () => Promise<void>
  /** Launches the agent on a chantier that has none yet */
  onStart: () => void
  sending: boolean
  /** Whether the chantier still takes messages */
  open: boolean
  error?: string
}

/** What the status line says under the turns, when the agent is not simply waiting */
const STATUS_LINES: Partial<Record<Chantier['status'], string>> = {
  pending:
    'Ce chantier reprend des brouillons déjà là. Lancez l’agent quand vous voulez vous y mettre : il commencera par en faire l’inventaire.',
  working: 'L’agent travaille… Les brouillons arrivent dans la liste au fur et à mesure.',
  blocked:
    'L’agent est arrêté : son budget est atteint, ou il attend une décision dans la console Anthropic.',
  ended: 'La session de l’agent est terminée : ce chantier ne prend plus de messages.',
  closed: 'Chantier clôturé.',
}

/**
 * The conversation of a chantier: what a person sent, what the agent
 * answered, where it stands. The first answer loses its title line, which
 * names the chantier above.
 */
export default function ChantierDialogue({
  chantier,
  messages,
  sheet,
  onSheet,
  onSend,
  onClose,
  onDelete,
  onStart,
  sending,
  open,
  error,
}: ChantierDialogueProps) {
  const firstAnswer = messages.find(({ role }) => role === 'agent')?.id
  const statusLine = STATUS_LINES[chantier.status]

  return (
    <DialogueSheet
      label="L’agent du chantier"
      note="Conservé avec le chantier"
      handleNote={CHANTIER_STATUS_LABELS[chantier.status]}
      sheet={sheet}
      onSheet={onSheet}
      composer={
        <>
          {chantier.status === 'pending' ? (
            <div className={styles.start}>
              <button
                type="button"
                className={styles.startButton}
                onClick={onStart}
                disabled={sending}
              >
                {sending ? 'Lancement…' : 'Lancer l’agent'}
              </button>
            </div>
          ) : (
            <Composer
              id="chantier-ask"
              label="Votre message à l’agent"
              placeholder="Dites ce qu’il faut chercher, vérifier ou changer…"
              onSend={onSend}
              disabled={!open || sending}
            />
          )}
          <div className={styles.fate}>
            {open && chantier.status !== 'pending' && (
              <button type="button" className={styles.close} onClick={onClose}>
                Clôturer le chantier
              </button>
            )}
            <ConfirmAction
              triggerLabel="Supprimer le chantier"
              warning="Le chantier, sa conversation et tous ses brouillons seront effacés, chez Anthropic aussi. Ce qu’une validation a déjà créé sur le site reste."
              confirmLabel="Supprimer"
              pendingLabel="Suppression…"
              onConfirm={onDelete}
            />
          </div>
        </>
      }
    >
      {messages.map((message) =>
        message.role === 'person' ? (
          <p key={message.id} className={styles.person}>
            {message.text}
          </p>
        ) : message.role === 'review' ? (
          <p key={message.id} className={styles.review}>
            {message.text}
          </p>
        ) : (
          <p key={message.id} className={styles.agent}>
            {message.id === firstAnswer ? withoutTitleLine(message.text) : message.text}
          </p>
        ),
      )}

      {statusLine && (
        <p className={styles.status}>
          {chantier.status === 'working' && <span aria-hidden="true" className={styles.spinner} />}
          {statusLine}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </DialogueSheet>
  )
}
