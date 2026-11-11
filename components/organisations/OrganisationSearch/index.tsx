'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { usePlausible } from 'next-plausible'
import {
  searchOrganisations,
  OrganisationSearchResult,
} from '../../../app/actions/search-organisations'
import { organisationHref } from '../../../domain/read-models/hrefs'
import OrganisationLogo from '../OrganisationLogo'
import SearchField from '../../ui/SearchField'
import styles from './OrganisationSearch.module.css'

export default function OrganisationSearch() {
  const plausible = usePlausible()

  const handleSearch = useCallback((query: string) => searchOrganisations(query), [])

  const handleSearchComplete = useCallback(
    (query: string, count: number) => {
      plausible('Recherche organisation', { props: { query, results: count } })
    },
    [plausible],
  )

  return (
    <SearchField<OrganisationSearchResult>
      placeholder="Rechercher une organisation…"
      onSearch={handleSearch}
      keyExtractor={(organisation) => organisation.id}
      onSearchComplete={handleSearchComplete}
      renderResult={(organisation) => (
        <Link href={organisationHref(organisation.slug)} className={styles.resultLink}>
          <OrganisationLogo
            slug={organisation.slug}
            name={organisation.name}
            acronym={organisation.acronym}
            size={32}
          />
          {organisation.name}
          {organisation.acronym && <span className={styles.acronym}>{organisation.acronym}</span>}
        </Link>
      )}
    />
  )
}
