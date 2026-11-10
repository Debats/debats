'use client'

import { ReactNode } from 'react'
import styles from './DialogueSheet.module.css'

/** How much of a small screen the dialogue takes: a bar, half of it, all of it */
export type Sheet = 'bar' | 'half' | 'full'

interface DialogueSheetProps {
  /** Names the dialogue, for the title and for assistive technology */
  label: string
  /** What the title line says under the name on a wide screen */
  note: string
  /** What the bar says under the name on a small screen: where things stand */
  handleNote: string
  sheet: Sheet
  onSheet: (sheet: Sheet) => void
  /** The turns, as a log: a screen reader hears each as it comes */
  children: ReactNode
  composer: ReactNode
}

const NEXT_SHEET: Record<Sheet, Sheet> = { bar: 'half', half: 'full', full: 'bar' }
const HANDLE_LABEL: Record<Sheet, string> = {
  bar: 'Ouvrir',
  half: 'Tout l’historique',
  full: 'Replier',
}

/**
 * The frame of a dialogue with an assistant: a panel beside the page on a
 * wide screen, a sheet at the foot of a small one that a bar opens in three
 * heights. What the turns hold is the caller's.
 */
export default function DialogueSheet({
  label,
  note,
  handleNote,
  sheet,
  onSheet,
  children,
  composer,
}: DialogueSheetProps) {
  return (
    <aside aria-label={label} className={`${styles.dialogue} ${styles[sheet]}`}>
      <div className={styles.head}>
        <button
          type="button"
          className={styles.handle}
          onClick={() => onSheet(NEXT_SHEET[sheet])}
          aria-expanded={sheet !== 'bar'}
        >
          <span className={styles.handleTitle}>
            {label}
            <span className={styles.handleNote}>{handleNote}</span>
          </span>
          <span className={styles.handleAction}>{HANDLE_LABEL[sheet]}</span>
        </button>
        <span className={styles.title}>{label}</span>
        <span className={styles.titleNote}>{note}</span>
      </div>

      <div className={styles.turns} role="log" aria-live="polite">
        {children}
      </div>

      <div className={styles.foot}>{composer}</div>
    </aside>
  )
}
