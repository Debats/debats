'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCombobox } from 'downshift'
import { usePlausible } from 'next-plausible'
import { searchEverywhere } from '../../../app/actions/search-site'
import {
  groupSearchHits,
  parseSearchQuery,
  SEARCH_KIND_LABELS,
  SearchHit,
  searchHitHref,
  searchHref,
} from '../../../domain/read-models/search'
import SearchHitRow from '../../search/SearchHitRow'
import SearchIcon from './SearchIcon'
import styles from './SiteSearch.module.css'

const DEBOUNCE_MS = 250

/**
 * Le champ de recherche du header : propose les résultats groupés au fil de la
 * frappe, Entrée sans sélection ouvre la page de tous les résultats.
 */
export default function SiteSearch() {
  const router = useRouter()
  const plausible = usePlausible()
  const [hits, setHits] = useState<SearchHit[]>([])
  /** The query the hits answer; the menu shows only when it is the one typed */
  const [searched, setSearched] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => clearTimeout(debounceRef.current ?? undefined), [])

  const search = useCallback(
    (raw: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      const query = parseSearchQuery(raw)
      if (!query) {
        setHits([])
        setSearched(null)
        return
      }
      debounceRef.current = setTimeout(async () => {
        const found = await searchEverywhere(query)
        setHits(found)
        setSearched(query)
        plausible('Recherche', { props: { query, results: found.length } })
      }, DEBOUNCE_MS)
    },
    [plausible],
  )

  const { isOpen, inputValue, highlightedIndex, getInputProps, getMenuProps, getItemProps, reset } =
    useCombobox({
      items: hits,
      itemToString: (hit) => hit?.title ?? '',
      onInputValueChange: ({ inputValue: value, type }) => {
        if (type === useCombobox.stateChangeTypes.InputChange) search(value ?? '')
      },
      onSelectedItemChange: ({ selectedItem }) => {
        if (!selectedItem) return
        router.push(searchHitHref(selectedItem))
        // The header stays on the next page: the field is ready for another search
        reset()
      },
    })

  const query = parseSearchQuery(inputValue)
  const showMenu = isOpen && query !== null && searched === query

  return (
    <div className={styles.search} role="search">
      {/* Where the field has no room, the loupe alone leads to the results page */}
      <Link href="/recherche" className={styles.loupe} aria-label="Rechercher">
        <SearchIcon />
      </Link>
      <SearchIcon className={styles.icon} />
      <input
        {...getInputProps({
          placeholder: 'Un sujet, une personnalité…',
          'aria-label': 'Rechercher sur le site',
          className: styles.input,
          onKeyDown: (event) => {
            // Enter on the field itself, nothing highlighted: the whole results page
            if (event.key === 'Enter' && highlightedIndex === -1 && query) {
              event.preventDefault()
              router.push(searchHref(query))
            }
          },
        })}
      />
      <ul {...getMenuProps({ className: showMenu ? styles.menu : styles.menuClosed })}>
        {showMenu && hits.length === 0 && (
          <li className={styles.none}>Aucun résultat pour « {query} »</li>
        )}
        {showMenu &&
          groupSearchHits(hits).map((group) => (
            <li key={group.kind} className={styles.group}>
              <span className={styles.groupTitle}>{SEARCH_KIND_LABELS[group.kind].plural}</span>
              <ul className={styles.groupList}>
                {group.hits.map((hit) => {
                  // Downshift walks the flat list: a hit's index is its place in it
                  const index = hits.indexOf(hit)
                  return (
                    <li
                      key={`${hit.kind}-${hit.id}`}
                      {...getItemProps({
                        item: hit,
                        index,
                        className:
                          highlightedIndex === index
                            ? `${styles.item} ${styles.itemOn}`
                            : styles.item,
                      })}
                    >
                      <SearchHitRow hit={hit} />
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        {showMenu && hits.length > 0 && (
          <li className={styles.all}>
            <Link href={searchHref(query)} className={styles.allLink}>
              Tous les résultats pour « {query} »
            </Link>
          </li>
        )}
      </ul>
    </div>
  )
}
