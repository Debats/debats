'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { deleteOccupationAction } from '../../actions/delete-occupation'
import { deleteOccupationFamilyAction } from '../../actions/delete-occupation-family'
import ConfirmAction from '../../../components/ui/ConfirmAction'
import FormError from '../../../components/ui/FormError'
import { plural } from '../../../lib/plural'
import styles from '../metiers.module.css'

export interface FamilyData {
  id: string
  name: string
  slug: string
  description: string
  /** Distinct public figures holding one of its occupations */
  figuresCount: number
}

interface FamilyGroup {
  family: FamilyData
  occupations: Array<{ id: string; name: string; figuresCount: number }>
}

interface FamilyListProps {
  groups: FamilyGroup[]
  canManage: boolean
}

/** Les familles et leurs métiers ; les Idéalistes retirent un métier ou une famille d'ici. */
export default function FamilyList({ groups, canManage }: FamilyListProps) {
  const router = useRouter()
  const [error, setError] = useState<string>()

  const removeOccupation = async (occupationId: string) => {
    setError(undefined)
    const result = await deleteOccupationAction(occupationId)
    if (result.success) router.refresh()
    else setError(result.error)
  }

  const removeFamily = async (familyId: string) => {
    const result = await deleteOccupationFamilyAction(familyId)
    if (!result.success) throw new Error(result.error)
    router.refresh()
  }

  if (groups.length === 0) {
    return <p className={styles.empty}>Aucune famille de métiers pour le moment.</p>
  }

  return (
    <div className={styles.list}>
      {error && <FormError message={error} />}
      {groups.map(({ family, occupations }) => (
        <section key={family.id} className={styles.family}>
          <div className={styles.head}>
            <h2 className={styles.naming}>
              <Link href={`/metiers/${family.slug}`} className={styles.name}>
                {family.name}
              </Link>
              <span className={styles.count}>
                {family.figuresCount} {plural(family.figuresCount, 'personnalité', 'personnalités')}
              </span>
            </h2>
            {canManage && (
              <ConfirmAction
                triggerLabel="Supprimer la famille"
                warning={`Supprimer « ${family.name} » et ses ${occupations.length} métiers ? Les personnalités qui les tiennent les perdront.`}
                onConfirm={() => removeFamily(family.id)}
              />
            )}
          </div>
          {family.description && <p className={styles.description}>{family.description}</p>}
          {occupations.length === 0 ? (
            <p className={styles.empty}>Aucun métier dans cette famille.</p>
          ) : (
            <ul className={styles.occupations}>
              {occupations.map((occupation) => (
                <li key={occupation.id} className={styles.occupation}>
                  {occupation.name}
                  {occupation.figuresCount > 0 && (
                    <span className={styles.occupationCount}>{occupation.figuresCount}</span>
                  )}
                  {canManage && (
                    <button
                      type="button"
                      className={styles.remove}
                      onClick={() => removeOccupation(occupation.id)}
                      aria-label={`Retirer le métier ${occupation.name}`}
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
