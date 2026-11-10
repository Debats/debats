'use client'

import { RevisableField } from '../../../../domain/services/draft-revision'
import { Choice } from '../../../actions/revise-draft'
import { DialogueTurn, RevisionStatus } from '../useDraftRevision'
import AssistantTurn from './AssistantTurn'
import Composer from './Composer'
import styles from './DraftDialogue.module.css'

/** How much of a small screen the dialogue takes: a bar, half of it, all of it */
export type Sheet = 'bar' | 'half' | 'full'

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

const NEXT_SHEET: Record<Sheet, Sheet> = { bar: 'half', half: 'full', full: 'bar' }
const HANDLE_LABEL: Record<Sheet, string> = {
  bar: 'Ouvrir',
  half: 'Tout l’historique',
  full: 'Replier',
}

const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`

/**
 * The dialogue with the assistant, beside the form on a wide screen and as a
 * sheet at the foot of a small one. The turns are a log: a screen reader
 * hears each answer as it comes, and the person keeps writing meanwhile.
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

  return (
    <aside aria-label="Relecture avec l’IA" className={`${styles.dialogue} ${styles[sheet]}`}>
      <div className={styles.head}>
        <button
          type="button"
          className={styles.handle}
          onClick={() => onSheet(NEXT_SHEET[sheet])}
          aria-expanded={sheet !== 'bar'}
        >
          <span className={styles.handleTitle}>
            Relecture avec l’IA
            <span className={styles.handleNote}>
              {reading
                ? 'Relecture en cours…'
                : revisedCount > 0
                  ? `${plural(revisedCount, 'champ modifié', 'champs modifiés')}`
                  : 'Rien n’est conservé'}
            </span>
          </span>
          <span className={styles.handleAction}>{HANDLE_LABEL[sheet]}</span>
        </button>
        <span className={styles.title}>Relecture avec l’IA</span>
        <span className={styles.titleNote}>Rien n’est conservé</span>
      </div>

      <div className={styles.turns} role="log" aria-live="polite">
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
      </div>

      <Composer onAsk={onAsk} disabled={reading} />
    </aside>
  )
}
