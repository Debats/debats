import { MAX_QUERY_LENGTH, MIN_QUERY_LENGTH } from '../../../domain/read-models/search'
import styles from './SearchForm.module.css'

interface SearchFormProps {
  initialQuery?: string
  /** Sur la page de résultats, le champ vide attend la frappe ; ailleurs il ne prend pas le focus */
  autoFocus?: boolean
  /** La recherche en ouverture de page : un champ en pilule, plus haut, qui nomme tout ce qu'on y trouve */
  prominent?: boolean
}

/** Le formulaire de recherche : une requête GET vers la page de résultats, sans script. */
export default function SearchForm({ initialQuery = '', autoFocus, prominent }: SearchFormProps) {
  return (
    <form
      action="/recherche"
      method="get"
      role="search"
      className={prominent ? `${styles.form} ${styles.prominent}` : styles.form}
    >
      <input
        type="search"
        name="q"
        defaultValue={initialQuery}
        placeholder={
          prominent
            ? 'Un sujet, une personnalité, une organisation, un argument…'
            : 'Un sujet, une personnalité…'
        }
        aria-label="Rechercher sur le site"
        minLength={MIN_QUERY_LENGTH}
        maxLength={MAX_QUERY_LENGTH}
        required
        autoFocus={autoFocus}
        className={styles.input}
      />
      <button type="submit" className={styles.button}>
        Rechercher
      </button>
    </form>
  )
}
