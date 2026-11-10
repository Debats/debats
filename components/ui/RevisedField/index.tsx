import { ReactNode } from 'react'
import styles from './RevisedField.module.css'

interface RevisedFieldProps {
  /** Whether the assistant wrote over this field and it was not touched since */
  revised: boolean
  onUndo: () => void
  children: ReactNode
}

/**
 * A field the assistant wrote over: tinted, named as such, and undoable in
 * place. Untouched, it renders its field and nothing else.
 */
export default function RevisedField({ revised, onUndo, children }: RevisedFieldProps) {
  if (!revised) return <>{children}</>

  return (
    <div className={styles.revised}>
      <p className={styles.mark}>
        <span>Modifié par l’IA</span>
        <button type="button" className={styles.undo} onClick={onUndo}>
          Annuler
        </button>
      </p>
      {children}
    </div>
  )
}
