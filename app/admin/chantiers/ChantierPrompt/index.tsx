import { ReactNode } from 'react'
import Button from '../../../../components/ui/Button'
import styles from './ChantierPrompt.module.css'

interface ChantierPromptProps {
  /** What the prompt is about, in two or three words */
  label: string
  /** What the person is told before she decides */
  children: ReactNode
  actionLabel: string
  /** What the button says while the action runs */
  pendingLabel: string
  pending: boolean
  /** Why the action cannot be taken for now, said under the button, which is then disabled */
  hint?: string
  /** Why the last attempt did not go through, when it did not */
  refusal?: string
  onAct: () => void
}

/**
 * Something the person may do for the agent of a chantier, shown only when
 * there is a reason to: what it is about, what it changes, and the button.
 */
export default function ChantierPrompt({
  label,
  children,
  actionLabel,
  pendingLabel,
  pending,
  hint,
  refusal,
  onAct,
}: ChantierPromptProps) {
  return (
    <div className={styles.prompt}>
      <p className={styles.label}>{label}</p>
      <p className={styles.text}>{children}</p>
      <div>
        <Button
          variant="secondary"
          size="small"
          onClick={onAct}
          disabled={pending || hint !== undefined}
        >
          {pending ? pendingLabel : actionLabel}
        </Button>
      </div>
      {hint && <p className={styles.hint}>{hint}</p>}
      {refusal && (
        <p className={styles.refusal} role="alert">
          {refusal}
        </p>
      )}
    </div>
  )
}
