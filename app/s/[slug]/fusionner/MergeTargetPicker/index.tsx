'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { searchSubjects } from '../../../../actions/search-subjects'
import { subjectMergeHref } from '../../../../../domain/read-models/subject-merge'
import Combobox from '../../../../../components/ui/Combobox'
import styles from './MergeTargetPicker.module.css'

interface MergeTargetPickerProps {
  /** The subject that will disappear: never offered as its own target */
  subjectId: string
  subjectSlug: string
}

/** First step of a merge: which subject remains. The choice is carried by the address. */
export default function MergeTargetPicker({ subjectId, subjectSlug }: MergeTargetPickerProps) {
  const router = useRouter()

  const handleSearch = useCallback(
    async (query: string) => {
      const results = await searchSubjects(query)
      // The slug is what the address of the next step carries
      return results
        .filter((subject) => subject.id !== subjectId)
        .map((subject) => ({ id: subject.slug, label: subject.title }))
    },
    [subjectId],
  )

  const handleSelect = useCallback(
    (targetSlug: string) => {
      if (targetSlug) router.push(subjectMergeHref(subjectSlug, targetSlug))
    },
    [router, subjectSlug],
  )

  return (
    <div className={styles.picker}>
      <p className={styles.lead}>
        Ce sujet disparaîtra dans celui que vous choisissez : ses prises de position le rejoindront,
        et son adresse y conduira. Le sujet conservé garde son titre, sa présentation et sa
        problématique.
      </p>
      <Combobox
        label="Sujet à conserver"
        id="merge-target"
        name="merge-target"
        placeholder="Rechercher le sujet à conserver…"
        onSearch={handleSearch}
        onSelect={handleSelect}
      />
    </div>
  )
}
