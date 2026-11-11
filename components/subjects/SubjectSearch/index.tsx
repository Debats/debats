'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { searchSubjects, SubjectSearchResult } from '../../../app/actions/search-subjects'
import { subjectHref } from '../../../domain/read-models/hrefs'
import SearchField from '../../ui/SearchField'
import styles from './SubjectSearch.module.css'

export default function SubjectSearch() {
  const handleSearch = useCallback((query: string) => searchSubjects(query), [])

  return (
    <SearchField<SubjectSearchResult>
      placeholder="Rechercher un sujet…"
      onSearch={handleSearch}
      keyExtractor={(s) => s.id}
      renderResult={(subject) => (
        <Link href={subjectHref(subject.slug)} className={styles.resultLink}>
          {subject.title}
        </Link>
      )}
    />
  )
}
