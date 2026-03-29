'use client'

import { useMemo, useState } from 'react'
import { DraftStatement } from '../../../../domain/entities/draft-statement'
import { DraftResolution } from '../../../../domain/use-cases/resolve-draft'
import DraftCard from '../DraftCard'
import styles from './DraftList.module.css'

type DraftWithResolution = {
  draft: DraftStatement
  resolution: DraftResolution
}

interface DraftListProps {
  drafts: DraftWithResolution[]
}

export default function DraftList({ drafts }: DraftListProps) {
  const [selectedSubject, setSelectedSubject] = useState('')

  const { subjectTitles, countBySubject } = useMemo(() => {
    const counts = new Map<string, number>()
    for (const d of drafts) {
      const t = d.draft.subjectTitle
      counts.set(t, (counts.get(t) ?? 0) + 1)
    }
    const titles = Array.from(counts.keys()).sort((a, b) => a.localeCompare(b, 'fr'))
    return { subjectTitles: titles, countBySubject: counts }
  }, [drafts])

  const filtered = selectedSubject
    ? drafts.filter((d) => d.draft.subjectTitle === selectedSubject)
    : drafts

  return (
    <>
      {subjectTitles.length > 1 && (
        <div className={styles.filter}>
          <label className={styles.label} htmlFor="subject-filter">
            Sujet
          </label>
          <select
            id="subject-filter"
            className={styles.select}
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="">Tous les sujets ({drafts.length})</option>
            {subjectTitles.map((title) => (
              <option key={title} value={title}>
                {title} ({countBySubject.get(title)})
              </option>
            ))}
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className={styles.empty}>Aucun brouillon pour ce sujet.</p>
      ) : (
        <div className={styles.list}>
          {filtered.map(({ draft, resolution }) => (
            <DraftCard key={draft.id} draft={draft} resolution={resolution} />
          ))}
        </div>
      )}
    </>
  )
}
