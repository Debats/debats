import { markedExcerpt } from '../../../domain/read-models/search-excerpt'
import styles from './SearchHitRow.module.css'

interface SearchExcerptProps {
  excerpt: string
  /** Ce qui a été cherché : ses mots sont marqués dans le passage */
  query: string
}

/** Le passage d'un texte long où se tiennent les mots cherchés. */
export default function SearchExcerpt({ excerpt, query }: SearchExcerptProps) {
  return (
    <span className={styles.excerpt}>
      {markedExcerpt(excerpt, query).map((part, index) =>
        part.found ? (
          <mark key={index} className={styles.found}>
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      )}
    </span>
  )
}
