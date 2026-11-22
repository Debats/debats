'use client'

import { FormEvent, useCallback, useState } from 'react'
import { useRedirectingAction } from '../../../../../hooks/useRedirectingAction'
import { PositionFate } from '../../../../../domain/aggregates/subject-events'
import { plural } from '../../../../../lib/plural'
import { mergeSubjectsAction } from '../../../../actions/merge-subjects'
import ActionLink from '../../../../../components/ui/ActionLink'
import Button from '../../../../../components/ui/Button'
import FormError from '../../../../../components/ui/FormError'
import PositionFateField, { CARRIED_OVER } from './PositionFateField'
import styles from './MergeSubjectsForm.module.css'

/** A subject as the page read it: the revision is the one its positions were listed at */
interface MergedSubject {
  id: string
  title: string
  revision: number
}

interface MergeSubjectsFormProps {
  /** The subject that disappears */
  absorbed: MergedSubject
  /** The subject that remains */
  kept: MergedSubject
  /** The open positions of the subject that disappears, each with the authors who took it */
  positions: Array<{ id: string; title: string; voices: number }>
  keptPositions: Array<{ id: string; title: string }>
  /** The fate proposed for each position, for the contributor to change */
  proposed: PositionFate[]
  /** Back to the choice of the subject that remains */
  otherTargetHref: string
}

/** Second step of a merge: what becomes of each position, then the merge itself */
export default function MergeSubjectsForm({
  absorbed,
  kept,
  positions,
  keptPositions,
  proposed,
  otherTargetHref,
}: MergeSubjectsFormProps) {
  const [into, setInto] = useState<Record<string, string>>(() =>
    Object.fromEntries(proposed.map((fate) => [fate.positionId, fate.into ?? CARRIED_OVER])),
  )
  const { run, isPending, error } = useRedirectingAction()

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault()
      // On success the action redirects to the subject that remains
      return run(
        () =>
          mergeSubjectsAction({
            sourceSubjectId: absorbed.id,
            sourceRevision: absorbed.revision,
            targetSubjectId: kept.id,
            targetRevision: kept.revision,
            positions: positions.map(({ id }) =>
              into[id] ? { positionId: id, into: into[id] } : { positionId: id },
            ),
          }),
        { absorbed: absorbed.id, kept: kept.id },
      )
    },
    [run, absorbed, kept, positions, into],
  )

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <p className={styles.lead}>
        « {absorbed.title} » disparaîtra dans <strong>« {kept.title} »</strong>, qui garde son
        titre, sa présentation et sa problématique, et reçoit les thématiques et les sujets connexes
        qui lui manquaient. L’ancienne adresse conduira au sujet conservé.{' '}
        <ActionLink href={otherTargetHref} quiet>
          Choisir un autre sujet
        </ActionLink>
      </p>

      {positions.length > 0 ? (
        <fieldset className={styles.positions}>
          <legend className={styles.legend}>
            {plural(
              positions.length,
              'Que devient sa position ?',
              'Que deviennent ses positions ?',
            )}
          </legend>
          {positions.map((position) => (
            <PositionFateField
              key={position.id}
              position={position}
              keptSubjectTitle={kept.title}
              keptPositions={keptPositions}
              value={into[position.id] ?? CARRIED_OVER}
              onChange={(value) => setInto((current) => ({ ...current, [position.id]: value }))}
            />
          ))}
        </fieldset>
      ) : (
        <p className={styles.empty}>Ce sujet n’a aucune position à reporter.</p>
      )}

      {error && <FormError message={error} />}

      <div className={styles.actions}>
        <Button type="submit" variant="danger" disabled={isPending}>
          {isPending ? 'Fusion…' : 'Fusionner les deux sujets'}
        </Button>
        <span className={styles.warning}>Une fusion ne s’annule pas.</span>
      </div>
    </form>
  )
}
