import { RevisableField } from '../../../../domain/services/draft-revision'
import { Choice, SourceReading } from '../../../actions/revise-draft'
import { DialogueTurn } from '../useDraftRevision'
import styles from './DraftDialogue.module.css'

interface AssistantTurnProps {
  turn: Extract<DialogueTurn, { role: 'assistant' }>
  onChoose: (choice: Choice) => void
  onSeeField: (field: RevisableField) => void
}

/** What reading the source gave, in the words a person would use */
const sourceLine = ({ host, verdict }: SourceReading): string => {
  switch (verdict.kind) {
    case 'verified':
      return `Source lue · ${host} · citation retrouvée mot pour mot`
    case 'close':
      return `Source lue · ${host} · citation retrouvée en partie`
    case 'missing':
      return `Source lue · ${host} · citation introuvable sur la page`
    case 'reachable':
      return `Source lue · ${host}`
    case 'unreachable':
      return `Source non lue · ${host} · ${verdict.reason}`
    case 'unverifiable':
      return `Source non lue · ${host} · ${verdict.reason}`
  }
}

/**
 * One answer of the assistant: what it said, where the source stands, the
 * fields it changed (each a way to the field), and what it only proposes.
 */
export default function AssistantTurn({ turn, onChoose, onSeeField }: AssistantTurnProps) {
  return (
    <div className={styles.assistant}>
      {turn.source && (
        <span className={turn.source.verdict.kind === 'verified' ? styles.sourceOk : styles.source}>
          {sourceLine(turn.source)}
        </span>
      )}
      <p className={styles.reply}>{turn.text}</p>

      {turn.applied.length > 0 && (
        <ul className={styles.applied} aria-label="Champs modifiés par l’IA">
          <li className={styles.appliedHead}>Modifié dans le formulaire</li>
          {turn.applied.map(({ field, label }) => (
            <li key={field} className={styles.appliedField}>
              <strong>{label}</strong>
              <button type="button" className={styles.seeField} onClick={() => onSeeField(field)}>
                Voir le champ
              </button>
            </li>
          ))}
        </ul>
      )}

      {turn.choices.length > 0 && (
        <div className={styles.choices}>
          {turn.choices.map((choice) => (
            <button
              key={choice.label}
              type="button"
              className={styles.choice}
              onClick={() => onChoose(choice)}
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
