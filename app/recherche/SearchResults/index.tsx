import Link from 'next/link'
import SearchHitRow from '../../../components/search/SearchHitRow'
import { SEARCH_KIND_LABELS, SearchGroup, searchHitHref } from '../../../domain/read-models/search'
import { plural } from '../../../lib/plural'
import styles from './SearchResults.module.css'

interface SearchResultsProps {
  /** The query as the search took it; null when nothing was asked yet, or too little */
  query: string | null
  groups: SearchGroup[]
}

/** Les résultats de la page de recherche, groupés par type. */
export default function SearchResults({ query, groups }: SearchResultsProps) {
  if (!query) {
    return <p className={styles.empty}>Tapez au moins deux caractères pour chercher.</p>
  }
  if (groups.length === 0) {
    return (
      <p className={styles.empty}>
        Aucun résultat pour « {query} ». Essayez un autre mot, ou un seul.
      </p>
    )
  }

  const total = groups.reduce((sum, group) => sum + group.hits.length, 0)
  return (
    <div className={styles.results}>
      <p className={styles.count}>
        {total} {plural(total, 'résultat', 'résultats')} pour « {query} »
      </p>
      {groups.map((group) => (
        <section key={group.kind} className={styles.group}>
          <h2 className={styles.groupTitle}>
            {SEARCH_KIND_LABELS[group.kind].plural}
            <span className={styles.groupCount}>{group.hits.length}</span>
          </h2>
          <ul className={styles.list}>
            {group.hits.map((hit) => (
              <li key={hit.id}>
                <Link href={searchHitHref(hit)} className={styles.hit}>
                  <SearchHitRow hit={hit} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
