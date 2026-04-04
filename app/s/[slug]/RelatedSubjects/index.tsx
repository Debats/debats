'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { linkSubjectsAction, unlinkSubjectsAction } from '../../../actions/link-subjects'
import { searchSubjects } from '../../../actions/search-subjects'
import Combobox from '../../../../components/ui/Combobox'
import FormError from '../../../../components/ui/FormError'
import styles from './RelatedSubjects.module.css'
import { RelatedSubjectData } from './types'

interface RelatedSubjectsProps {
  subjectId: string
  related: RelatedSubjectData[]
  canManage: boolean
}

export default function RelatedSubjects({ subjectId, related, canManage }: RelatedSubjectsProps) {
  const router = useRouter()
  const [comboboxKey, setComboboxKey] = useState(0)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string>()

  const handleSearch = useCallback(
    async (query: string) => {
      const results = await searchSubjects(query)
      const excludeIds = new Set([subjectId, ...related.map((r) => r.id)])
      return results.filter((r) => !excludeIds.has(r.id)).map((r) => ({ id: r.id, label: r.title }))
    },
    [subjectId, related],
  )

  const handleSelect = useCallback(
    async (selectedId: string) => {
      if (!selectedId) return
      setError(undefined)
      const result = await linkSubjectsAction(subjectId, selectedId)
      if (result.success) {
        setComboboxKey((k) => k + 1)
        router.refresh()
      } else {
        setError(result.error)
      }
    },
    [subjectId, router],
  )

  const handleUnlink = useCallback(
    async (relatedId: string) => {
      setError(undefined)
      setRemovingId(relatedId)
      const result = await unlinkSubjectsAction(subjectId, relatedId)
      setRemovingId(null)
      if (result.success) {
        router.refresh()
      } else {
        setError(result.error)
      }
    },
    [subjectId, router],
  )

  return (
    <div className={styles.container}>
      <label className={styles.title}>Sujets connexes</label>

      {error && <FormError message={error} />}

      {related.length === 0 && canManage && (
        <p className={styles.empty}>
          Aucun sujet connexe. Utilisez la recherche ci-dessous pour lier des sujets entre eux.
        </p>
      )}

      {related.length > 0 && (
        <div className={styles.chips}>
          {related.map((r) => (
            <span
              key={r.id}
              className={`${styles.chip} ${removingId === r.id ? styles.chipRemoving : ''}`}
            >
              <span className={styles.chipLabel}>{r.title}</span>
              {canManage && (
                <button
                  type="button"
                  className={styles.chipRemove}
                  onClick={() => handleUnlink(r.id)}
                  disabled={removingId === r.id}
                  aria-label={`Retirer le lien avec ${r.title}`}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d="M4 4l6 6M10 4l-6 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {canManage && (
        <div className={styles.searchRow}>
          <Combobox
            key={comboboxKey}
            label="Lier un sujet"
            id="related-subject"
            name="related-subject"
            placeholder="Rechercher un sujet à lier..."
            onSearch={handleSearch}
            onSelect={handleSelect}
          />
        </div>
      )}
    </div>
  )
}
