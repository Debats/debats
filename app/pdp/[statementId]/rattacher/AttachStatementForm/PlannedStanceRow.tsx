import { PlannedStance } from '../../../../../domain/read-models/attachment-plan'
import { formatDate } from '../../../../../lib/format-date'
import styles from './AttachStatementForm.module.css'

interface PlannedStanceRowProps {
  stance: PlannedStance
  /** The statement of the author attached to this position; empty to make a new one */
  attachedId: string
  onAttach: (statementId: string) => void
}

/**
 * Ce que le rattachement fait sur une position du texte : la prise de
 * position devient la signature, une signature antérieure la tient déjà, ou
 * il reste à dire si une autre prise de position de l'auteur·rice s'y
 * rattache — faute de quoi une nouvelle est créée.
 */
export default function PlannedStanceRow({ stance, attachedId, onAttach }: PlannedStanceRowProps) {
  const field = `attached-${stance.positionId}`

  return (
    <li className={styles.stance}>
      <span className={styles.stanceSubject}>{stance.subjectTitle}</span>
      <span className={styles.stancePosition}>{stance.positionTitle}</span>

      {stance.kind === 'attached' && (
        <span className={styles.outcome}>
          Cette prise de position devient la signature
          {stance.replaces && ', à la place de celle que la signature avait déjà créée ici'}.
        </span>
      )}

      {stance.kind === 'signed' && (
        <span className={styles.outcome}>Déjà tenue par sa signature : rien ne change.</span>
      )}

      {stance.kind === 'open' && stance.candidates.length === 0 && (
        <span className={styles.outcome}>Une nouvelle prise de position sera créée.</span>
      )}

      {stance.kind === 'open' && stance.candidates.length > 0 && (
        <span className={styles.choices} role="radiogroup" aria-label={stance.positionTitle}>
          {stance.candidates.map((candidate) => (
            <label key={candidate.id} className={styles.choice}>
              <input
                type="radio"
                name={field}
                checked={attachedId === candidate.id}
                onChange={() => onAttach(candidate.id)}
              />
              <span>
                Rattacher aussi « {candidate.summary} »{' '}
                <span className={styles.meta}>
                  {candidate.sourceName} · {formatDate(new Date(candidate.statedAt))}
                </span>
              </span>
            </label>
          ))}
          <label className={styles.choice}>
            <input
              type="radio"
              name={field}
              checked={attachedId === ''}
              onChange={() => onAttach('')}
            />
            <span>Créer une nouvelle prise de position</span>
          </label>
        </span>
      )}
    </li>
  )
}
