import { Action, rankThreshold, requiredRank } from '../../../domain/reputation/permissions'
import styles from './NewStatementForm.module.css'

interface LockedActionProps {
  /** Ce que le contributeur ne peut pas faire, à l'infinitif : « Référencer une personnalité » */
  what: string
  /** L'action du barème, qui dit seule le rang qu'elle demande */
  action: Action
  reputation: number
}

/**
 * Ce que le rang ne permet pas encore, dit au lieu d'être offert puis refusé.
 *
 * Le formulaire ne montre jamais un bouton qui échouera : à la place, il
 * nomme l'action, le rang qu'elle demande et ce qui reste à gagner. Un
 * contributeur sait ainsi par où y arriver, ce qu'un refus après coup ne lui
 * apprendrait pas.
 *
 * Le rang et son seuil viennent du barème, jamais de la vue : si l'un bouge,
 * ce bloc suit sans qu'on y pense.
 */
export default function LockedAction({ what, action, reputation }: LockedActionProps) {
  const needs = requiredRank(action)
  const missing = rankThreshold(needs) - reputation

  return (
    <div className={styles.locked}>
      <svg
        className={styles.lockedIcon}
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      <div>
        <p className={styles.lockedTitle}>
          {what} demande le rang {needs}
        </p>
        {missing > 0 && (
          <p className={styles.lockedText}>
            Il vous manque {missing.toLocaleString('fr-FR')} points. Chaque prise de position
            validée en rapporte 50 : c’est par là qu’on y arrive.
          </p>
        )}
      </div>
    </div>
  )
}
