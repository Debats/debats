'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setPublicFigureOccupationsAction } from '../../../../actions/set-public-figure-occupations'
import FormError from '../../../../../components/ui/FormError'
import TagSelector, { TagOption } from '../../../../../components/ui/TagSelector'
import styles from './FigureOccupations.module.css'

interface FigureOccupationsProps {
  figureId: string
  figureSlug: string
  availableOccupations: TagOption[]
  selectedIds: string[]
}

/** Les métiers d'une personnalité : chaque bascule est enregistrée aussitôt. */
export default function FigureOccupations({
  figureId,
  figureSlug,
  availableOccupations,
  selectedIds: initialSelectedIds,
}: FigureOccupationsProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState(initialSelectedIds)
  const [error, setError] = useState<string>()

  const handleChange = async (ids: string[]) => {
    setSelectedIds(ids)
    setError(undefined)
    const result = await setPublicFigureOccupationsAction(figureId, figureSlug, ids)
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Métiers et fonctions</h2>
      <p className={styles.hint}>
        Ce que la personnalité est ou a été dans le débat public. Plusieurs choix possibles,
        enregistrés à chaque clic. La liste se complète depuis la page des métiers.
      </p>
      {error && <FormError message={error} />}
      <TagSelector
        options={availableOccupations}
        value={selectedIds}
        onChange={handleChange}
        ariaLabel="Métiers de la personnalité"
      />
    </section>
  )
}
