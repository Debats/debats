import styles from './FieldAdvice.module.css'

/** Green, orange, red — the three things an advice is allowed to say */
export type AdviceVerdict = 'ok' | 'warning' | 'problem'

export interface Advice {
  verdict: AdviceVerdict
  /** One sentence about the writing, saying what to do */
  note: string
}

/** Advice on several fields, by the field's own name */
export type AdviceByField = Partial<Record<string, Advice>>

/** Each verdict has a sign and a word: colour alone says nothing to who cannot tell it */
const VERDICTS: Record<AdviceVerdict, { sign: string; word: string; className: string }> = {
  ok: { sign: '✓', word: 'conforme', className: styles.ok },
  warning: { sign: '!', word: 'à vérifier', className: styles.warning },
  problem: { sign: '✗', word: 'à corriger', className: styles.problem },
}

interface FieldAdviceProps {
  id: string
  advice: Advice
}

/**
 * An advice under a field: a verdict and a note, never a verdict alone.
 *
 * It is an opinion on the writing and not an error: nothing about it stops
 * the form, and it is for its reader to weigh. The `id` lets the field it
 * sits under name it in `aria-describedby`.
 */
export default function FieldAdvice({ id, advice }: FieldAdviceProps) {
  const verdict = VERDICTS[advice.verdict]

  return (
    <div id={id} className={styles.advice}>
      <span className={`${styles.verdict} ${verdict.className}`}>
        <span aria-hidden="true">{verdict.sign}</span>
        {verdict.word}
      </span>
      <p className={styles.note}>{advice.note}</p>
    </div>
  )
}
