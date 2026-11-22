import { StatementContentInput } from '../../../domain/use-cases/validate-statement-fields'
import { formatDate } from '../../../lib/format-date'
import styles from './StatementForm.module.css'

interface SaidByTheTextProps {
  positionId: string
  /** The position as the reader knows it; empty when it is no longer among the subject's */
  positionTitle: string
  content: StatementContentInput
  sourceName: string
  sourceUrl: string
  /** A calendar day, as the date field holds it: YYYY-MM-DD */
  statedAt: string
}

/**
 * What a signature says, shown and not offered to change: its position, its
 * words, its source and its day are those of the text it signs, the same for
 * every signatory.
 *
 * The values still travel with the form, untouched, in hidden fields: the
 * command takes a whole statement and refuses a signature whose saying
 * differs from the text's. A field that is merely disabled would not be sent.
 */
export default function SaidByTheText({
  positionId,
  positionTitle,
  content,
  sourceName,
  sourceUrl,
  statedAt,
}: SaidByTheTextProps) {
  const day = new Date(statedAt)

  return (
    <div className={styles.said}>
      <input type="hidden" name="positionId" value={positionId} />
      <input type="hidden" name="statementType" value={content.statementType} />
      <input type="hidden" name="quote" value={content.quote} />
      <input type="hidden" name="document" value={content.document} />
      <input type="hidden" name="votedText" value={content.votedText} />
      <input type="hidden" name="choice" value={content.choice} />
      <input type="hidden" name="deed" value={content.deed} />
      <input type="hidden" name="sourceName" value={sourceName} />
      <input type="hidden" name="sourceUrl" value={sourceUrl} />
      <input type="hidden" name="statedAt" value={statedAt} />

      <dl className={styles.saidFacts}>
        {positionTitle && (
          <>
            <dt className={styles.saidTerm}>Position</dt>
            <dd className={styles.saidValue}>{positionTitle}</dd>
          </>
        )}
        {content.quote && (
          <>
            <dt className={styles.saidTerm}>Citation</dt>
            <dd className={styles.saidValue}>« {content.quote} »</dd>
          </>
        )}
        <dt className={styles.saidTerm}>Source</dt>
        <dd className={styles.saidValue}>
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.saidLink}>
            {sourceName}
          </a>
        </dd>
        {!Number.isNaN(day.getTime()) && (
          <>
            <dt className={styles.saidTerm}>Date</dt>
            <dd className={styles.saidValue}>{formatDate(day)}</dd>
          </>
        )}
      </dl>
    </div>
  )
}
