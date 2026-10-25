'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setPublicFigureOccupationsAction } from '../../../../actions/set-public-figure-occupations'
import { OccupationAssignmentInput } from '../../../../../domain/read-models/occupations'
import FormError from '../../../../../components/ui/FormError'
import TagSelector, { TagGroup, TagOption } from '../../../../../components/ui/TagSelector'
import CurrentSwitch from '../CurrentSwitch'
import styles from './FigureOccupations.module.css'

interface FigureOccupationsProps {
  figureId: string
  figureSlug: string
  /** Les métiers disponibles, par famille */
  groups: TagGroup[]
  initialAssignments: OccupationAssignmentInput[]
  /** The revision of the figure's stream the selector shows; each save moves it */
  revision: number
}

/**
 * Les métiers d'une personnalité : on coche un métier, puis on dit s'il est
 * encore d'actualité. Chaque bascule est enregistrée aussitôt.
 */
export default function FigureOccupations({
  figureId,
  figureSlug,
  groups,
  initialAssignments,
  revision: initialRevision,
}: FigureOccupationsProps) {
  const router = useRouter()
  const [assignments, setAssignments] = useState(initialAssignments)
  const [revision, setRevision] = useState(initialRevision)
  const [error, setError] = useState<string>()

  const save = async (next: OccupationAssignmentInput[]) => {
    setAssignments(next)
    setError(undefined)
    const result = await setPublicFigureOccupationsAction(figureId, figureSlug, next, revision)
    if (result.success) {
      setRevision(result.revision)
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  /** A newly checked occupation is current until said otherwise */
  const handleSelection = (ids: string[]) =>
    save(
      ids.map(
        (occupationId) =>
          assignments.find((a) => a.occupationId === occupationId) ?? {
            occupationId,
            current: true,
          },
      ),
    )

  const handleCurrent = (occupationId: string, current: boolean) =>
    save(assignments.map((a) => (a.occupationId === occupationId ? { ...a, current } : a)))

  const renderSelected = (option: TagOption) => {
    const assignment = assignments.find((a) => a.occupationId === option.id)
    return (
      <CurrentSwitch
        id={`current-${option.id}`}
        occupationName={option.name}
        current={assignment?.current ?? true}
        onChange={(current) => handleCurrent(option.id, current)}
      />
    )
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Métiers et fonctions</h2>
      <p className={styles.hint}>
        Ce que la personnalité est ou a été dans le débat public. Cochez un métier, puis dites s’il
        est encore d’actualité. Enregistré à chaque clic ; la liste se complète depuis la page des
        métiers.
      </p>
      {error && <FormError message={error} />}
      <TagSelector
        groups={groups}
        value={assignments.map((a) => a.occupationId)}
        onChange={handleSelection}
        ariaLabel="Métiers de la personnalité"
        renderSelected={renderSelected}
      />
    </section>
  )
}
