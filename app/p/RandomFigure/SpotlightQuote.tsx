import { FigureSpotlight } from '../../../domain/read-models/figure-spotlight'
import { formatShortDate } from '../../../lib/format-date'
import styles from './RandomFigure.module.css'

/** Ses dernières paroles, avec d'où elles viennent. */
export default function SpotlightQuote({
  quote,
}: {
  quote: NonNullable<FigureSpotlight['quote']>
}) {
  return (
    <figure className={styles.quote}>
      <blockquote className={styles.words}>{quote.text}</blockquote>
      <figcaption className={styles.source}>
        {quote.sourceName} · {formatShortDate(quote.statedAt)}
      </figcaption>
    </figure>
  )
}
