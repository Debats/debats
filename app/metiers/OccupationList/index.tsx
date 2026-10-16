'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { deleteOccupationAction } from '../../actions/delete-occupation'
import ConfirmAction from '../../../components/ui/ConfirmAction'
import styles from '../metiers.module.css'

interface OccupationData {
  id: string
  name: string
  slug: string
  description: string
}

interface OccupationListProps {
  occupations: OccupationData[]
  canManage: boolean
}

/** La liste des métiers, avec la suppression pour les Idéalistes. */
export default function OccupationList({ occupations, canManage }: OccupationListProps) {
  const router = useRouter()

  const handleDelete = useCallback(
    async (occupationId: string) => {
      const result = await deleteOccupationAction(occupationId)
      if (!result.success) throw new Error(result.error)
      router.refresh()
    },
    [router],
  )

  if (occupations.length === 0) {
    return <p className={styles.empty}>Aucun métier pour le moment.</p>
  }

  return (
    <div className={styles.list}>
      {occupations.map((occupation) => (
        <div key={occupation.id} className={styles.item}>
          <div className={styles.info}>
            <Link href={`/metiers/${occupation.slug}`} className={styles.name}>
              {occupation.name}
            </Link>
            {occupation.description && (
              <p className={styles.description}>{occupation.description}</p>
            )}
          </div>
          {canManage && (
            <div className={styles.actions}>
              <ConfirmAction
                triggerLabel="Supprimer"
                warning={`Supprimer le métier « ${occupation.name} » ? Les personnalités qui le tiennent le perdront.`}
                onConfirm={() => handleDelete(occupation.id)}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
