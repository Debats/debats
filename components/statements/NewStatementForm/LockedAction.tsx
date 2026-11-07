import { Action, rankThreshold, requiredRank } from '../../../domain/reputation/permissions'
import styles from './NewStatementForm.module.css'

interface LockedActionProps {
  /** What the contributor cannot do, as an infinitive: « Référencer une personnalité » */
  what: string
  /** The action of the scale, the only thing that says which rank it asks for */
  action: Action
  reputation: number
}

/**
 * What the rank does not allow yet, said instead of offered and then refused.
 *
 * The form never shows a button that will fail: it names the action, the rank
 * it asks for and what is left to earn. A contributor then knows the way
 * there, which a refusal after the fact would not teach her.
 *
 * The rank and its threshold come from the scale, never from the view: if
 * either moves, this block follows without anyone thinking about it.
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
