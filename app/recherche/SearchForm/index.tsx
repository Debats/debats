import { MAX_QUERY_LENGTH, MIN_QUERY_LENGTH } from '../../../domain/read-models/search'
import styles from './SearchForm.module.css'

interface SearchFormProps {
  initialQuery: string
}

/** Le formulaire de la page de résultats : une requête GET, sans script. */
export default function SearchForm({ initialQuery }: SearchFormProps) {
  return (
    <form action="/recherche" method="get" role="search" className={styles.form}>
      <input
        type="search"
        name="q"
        defaultValue={initialQuery}
        placeholder="Un sujet, une personnalité…"
        aria-label="Rechercher sur le site"
        minLength={MIN_QUERY_LENGTH}
        maxLength={MAX_QUERY_LENGTH}
        required
        autoFocus={initialQuery === ''}
        className={styles.input}
      />
      <button type="submit" className={styles.button}>
        Rechercher
      </button>
    </form>
  )
}
