'use client'

import { RevisableField } from '../../../../domain/services/draft-revision'
import Composer from '../../../../components/ui/Composer'
import DialogueSheet, { Sheet } from '../../../../components/ui/DialogueSheet'
import { Choice } from '../../../actions/revise-draft'
import { DialogueTurn, RevisionStatus } from '../useDraftRevision'
import AssistantTurn from './AssistantTurn'
import styles from './DraftDialogue.module.css'

export type { Sheet } from '../../../../components/ui/DialogueSheet'

interface DraftDialogueProps {
  turns: DialogueTurn[]
  status: RevisionStatus
  suggestions: readonly string[]
  /** How many fields the assistant wrote over, for the bar */
  revisedCount: number
  sheet: Sheet
  onSheet: (sheet: Sheet) => void
  onAsk: (request: string) => void
  onChoose: (choice: Choice) => void
  onSeeField: (field: RevisableField) => void
}

const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`

/**
 * The dialogue with the assistant about one draft: its answers, what it
 * changed, what it proposes. The frame is the shared sheet; the turns are
 * a log, so a screen reader hears each answer as it comes.
 */
export default function DraftDialogue({
  turns,
  status,
  suggestions,
  revisedCount,
  sheet,
  onSheet,
  onAsk,
  onChoose,
  onSeeField,
}: DraftDialogueProps) {
  const reading = status.kind === 'reading'
  const handleNote = reading
    ? 'Relecture en cours…'
    : revisedCount > 0
      ? plural(revisedCount, 'champ modifié', 'champs modifiés')
      : 'Rien n’est conservé'

  return (
    <DialogueSheet
      label="Relecture avec l’IA"
      note="Rien n’est conservé"
      handleNote={handleNote}
      sheet={sheet}
      onSheet={onSheet}
      composer={
        <Composer
          id="draft-dialogue-ask"
          label="Votre demande à l’IA"
          placeholder="Dites ce qu’il faut changer, ou posez une question…"
          onSend={onAsk}
          disabled={reading}
        />
      }
    >
      {turns.map((turn, index) =>
        turn.role === 'user' ? (
          <p key={index} className={styles.person}>
            {turn.text}
          </p>
        ) : (
          <AssistantTurn key={index} turn={turn} onChoose={onChoose} onSeeField={onSeeField} />
        ),
      )}

      {status.kind === 'reading' && (
        <p className={styles.status}>
          <span aria-hidden="true" className={styles.spinner} />
          {status.source
            ? 'Relecture du brouillon et lecture de la source… Vous pouvez continuer à modifier les champs.'
            : 'Relecture en cours… Vous pouvez continuer à modifier les champs.'}
        </p>
      )}
      {status.kind === 'unavailable' && <p className={styles.status}>{status.message}</p>}

      {!reading && suggestions.length > 0 && (
        <div className={styles.suggestions}>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className={styles.suggestion}
              onClick={() => onAsk(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </DialogueSheet>
  )
}
