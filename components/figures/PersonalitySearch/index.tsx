'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  searchPublicFigures,
  PublicFigureSearchResult,
} from '../../../app/actions/search-public-figures'
import FigureAvatar from '../FigureAvatar'
import styles from './PersonalitySearch.module.css'

export default function PersonalitySearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PublicFigureSearchResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setHasSearched(false)
      return
    }

    const data = await searchPublicFigures(q)
    setResults(data)
    setHasSearched(true)
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, search])

  return (
    <div className={styles.searchContainer}>
      <input
        type="search"
        className={styles.searchInput}
        placeholder="Rechercher une personnalité…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {hasSearched && (
        <div className={styles.results}>
          {results.length === 0 ? (
            <p className={styles.noResults}>Aucun résultat pour « {query} »</p>
          ) : (
            results.map((figure) => (
              <Link key={figure.id} href={`/p/${figure.slug}`} className={styles.resultItem}>
                <FigureAvatar slug={figure.slug} name={figure.name} size={32} />
                {figure.name}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}
