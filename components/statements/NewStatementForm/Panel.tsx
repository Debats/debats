import { ReactNode } from 'react'
import styles from './NewStatementForm.module.css'

interface PanelProps {
  /** What is being created: « Nouvelle personnalité », « Nouvelle position » */
  title: string
  /** What cancelling gives back: « choisir une personnalité existante » */
  instead: string
  /**
   * Absent when there is nothing to go back to. The first position of a
   * subject being created is the only one it can have, so no way out of that
   * panel exists short of giving up the subject itself.
   */
  onCancel?: () => void
  children: ReactNode
}

/**
 * The frame of an entity created in place, shared by the three panels.
 *
 * Each panel holds its own fields; what they have in common is the frame and
 * the way out — the means to close without losing what was typed.
 */
export default function Panel({ title, instead, onCancel, children }: PanelProps) {
  return (
    <div className={styles.panel}>
      <p className={styles.panelTitle}>{title}</p>

      {children}

      {onCancel && (
        <button type="button" className={styles.panelCancel} onClick={onCancel}>
          Annuler et {instead}
        </button>
      )}
    </div>
  )
}
