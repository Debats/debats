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
 * Its note is phrased without a participle — « en même temps que » rather
 * than « écrite avec » — so that the frame agrees with nothing: the three
 * entities it holds today are feminine, a subject will not be.
 *
 * Each panel holds its own fields; what they have in common is the frame and
 * the way out — the reminder that nothing is written before the submission,
 * and the means to close without losing what was typed.
 */
export default function Panel({ title, instead, onCancel, children }: PanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <p className={styles.panelTitle}>{title}</p>
        <p className={styles.panelNote}>en même temps que votre prise de position</p>
      </div>

      {children}

      {onCancel && (
        <button type="button" className={styles.panelCancel} onClick={onCancel}>
          Annuler et {instead}
        </button>
      )}
    </div>
  )
}
