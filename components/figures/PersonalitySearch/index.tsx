'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { usePlausible } from 'next-plausible'
import {
  searchPublicFigures,
  PublicFigureSearchResult,
} from '../../../app/actions/search-public-figures'
import FigureAvatar from '../FigureAvatar'
import SearchField from '../../ui/SearchField'
import styles from './PersonalitySearch.module.css'

export default function PersonalitySearch() {
  const plausible = usePlausible()

  const handleSearch = useCallback((query: string) => searchPublicFigures(query), [])

  const handleSearchComplete = useCallback(
    (query: string, count: number) => {
      plausible('Recherche personnalité', { props: { query, results: count } })
    },
    [plausible],
  )

  return (
    <SearchField<PublicFigureSearchResult>
      placeholder="Rechercher une personnalité…"
      onSearch={handleSearch}
      keyExtractor={(f) => f.id}
      onSearchComplete={handleSearchComplete}
      renderResult={(figure) => (
        <Link href={`/p/${figure.slug}`} className={styles.resultLink}>
          <FigureAvatar slug={figure.slug} name={figure.name} size={32} />
          {figure.name}
        </Link>
      )}
    />
  )
}
