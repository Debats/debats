'use client'

import { useCallback, useEffect, useRef, useState, ReactNode } from 'react'
import styles from './SearchField.module.css'

interface SearchFieldProps<T> {
  placeholder: string
  onSearch: (query: string) => Promise<T[]>
  renderResult: (item: T) => ReactNode
  keyExtractor: (item: T) => string
  onSearchComplete?: (query: string, count: number) => void
  minLength?: number
  debounceMs?: number
}

export default function SearchField<T>({
  placeholder,
  onSearch,
  renderResult,
  keyExtractor,
  onSearchComplete,
  minLength = 2,
  debounceMs = 300,
}: SearchFieldProps<T>) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<T[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const search = useCallback(
    async (q: string) => {
      if (q.length < minLength) {
        setResults([])
        setHasSearched(false)
        return
      }

      const data = await onSearch(q)
      setResults(data)
      setHasSearched(true)
      onSearchComplete?.(q, data.length)
    },
    [onSearch, onSearchComplete, minLength],
  )

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), debounceMs)
    return () => clearTimeout(debounceRef.current)
  }, [query, search, debounceMs])

  return (
    <div className={styles.container}>
      <input
        type="search"
        className={styles.input}
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {hasSearched && (
        <div className={styles.results}>
          {results.length === 0 ? (
            <p className={styles.noResults}>Aucun résultat pour « {query} »</p>
          ) : (
            results.map((item) => (
              <div key={keyExtractor(item)} className={styles.resultItem}>
                {renderResult(item)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
