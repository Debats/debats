'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getPositionsForSubject,
  PositionOption,
} from '../../../app/actions/get-positions-for-subject'
import { StatementTopic } from '../../../domain/use-cases/create-statement'
import { useStatementDraft } from '../StatementDraft'
import { Chosen, ExistingOrNew } from './existing-or-new'
import { EMPTY_SUBJECT, SubjectDraft } from './NewSubjectPanel'
import { PositionDraft } from './NewPositionPanel'
import { Created } from './WhatWillBeWritten'

const EMPTY_POSITION: PositionDraft = { title: '', description: '' }

/**
 * The position side. It is not an `ExistingOrNew`, and deliberately so: a
 * position is ticked from a list already loaded, not searched in a field, so
 * there is no choice to come back on and no Combobox to remount. It would
 * borrow the shape's words without its reason.
 */
interface PositionSide {
  /** The positions of the chosen subject, and whether they are still coming */
  options: PositionOption[]
  loading: boolean
  /** True while a new position is being described. Always true for a new subject */
  creating: boolean
  startNew: () => void
  cancelNew: () => void
  draft: PositionDraft
  change: (position: PositionDraft) => void
  chosenId: string
  choose: (id: string) => void
}

export interface TopicChoice {
  subject: ExistingOrNew<SubjectDraft>
  position: PositionSide

  /** What the submission will carry: a subject and the position defended on it */
  input: StatementTopic
  /** What the submission will create on this side, for the recap */
  created: Created[]
}

/**
 * What the statement is about: a subject, and the position it defends on it —
 * the form's « Sur quoi ? ».
 *
 * The two are held together because they are not independent. A subject
 * created here has no position to choose from, so its first position is
 * created with it: `creatingPosition` is therefore true whenever
 * `creatingSubject` is, and the panel is the only thing the position side can
 * show. That is the same rule the command's union states, enforced here so
 * the form cannot even offer the combination.
 *
 * The hook reports to the rail's preview itself, through the shared draft: it
 * owns the subject and the position, so it owns the two titles that name them.
 *
 * `initial` seeds the states and is read on the first render only: a page that
 * opens the form on a subject does not change it while the form is filled.
 */
export function useTopicChoice(initial: { subject?: Chosen }): TopicChoice {
  const { updateDraft } = useStatementDraft()

  const [chosen, setChosen] = useState<Chosen | undefined>(initial.subject)
  const [creatingSubject, setCreatingSubject] = useState(false)
  const [subject, setSubject] = useState<SubjectDraft>(EMPTY_SUBJECT)

  const [positions, setPositions] = useState<PositionOption[]>([])
  const [loadingPositions, setLoadingPositions] = useState(!!initial.subject)
  const [chosenPositionId, setChosenPositionId] = useState('')
  const [creatingPosition, setCreatingPosition] = useState(false)
  const [position, setPosition] = useState<PositionDraft>(EMPTY_POSITION)

  const chosenSubjectId = chosen?.id ?? ''

  useEffect(() => {
    if (!chosenSubjectId) return

    const controller = new AbortController()
    getPositionsForSubject(chosenSubjectId).then((result) => {
      if (controller.signal.aborted) return
      setPositions(result)
      setLoadingPositions(false)
    })
    return () => controller.abort()
  }, [chosenSubjectId])

  /* Positions belong to their subject: another subject voids what was ticked */
  const chooseSubject = useCallback(
    (next?: Chosen) => {
      setChosen(next)
      setPositions([])
      setChosenPositionId('')
      setCreatingPosition(false)
      setPosition(EMPTY_POSITION)
      setLoadingPositions(!!next)
      updateDraft({ subjectTitle: next?.label ?? '', positionTitle: '' })
    },
    [updateDraft],
  )

  const startNewSubject = useCallback(() => {
    setCreatingSubject(true)
    setChosenPositionId('')
    updateDraft({ subjectTitle: subject.title, positionTitle: position.title })
  }, [position.title, subject.title, updateDraft])

  /** Back to choosing. What was typed stays, on both sides */
  const cancelNewSubject = useCallback(() => {
    setCreatingSubject(false)
    updateDraft({ subjectTitle: chosen?.label ?? '', positionTitle: '' })
  }, [chosen, updateDraft])

  const changeSubject = useCallback(
    (next: SubjectDraft) => {
      setSubject(next)
      updateDraft({ subjectTitle: next.title })
    },
    [updateDraft],
  )

  const startNewPosition = useCallback(() => {
    setCreatingPosition(true)
    updateDraft({ positionTitle: position.title })
  }, [position.title, updateDraft])

  /** Cancelling gives back the position that was ticked before typing */
  const cancelNewPosition = useCallback(() => {
    setCreatingPosition(false)
    updateDraft({
      positionTitle: positions.find((p) => p.id === chosenPositionId)?.title ?? '',
    })
  }, [chosenPositionId, positions, updateDraft])

  const changePosition = useCallback(
    (next: PositionDraft) => {
      setPosition(next)
      updateDraft({ positionTitle: next.title })
    },
    [updateDraft],
  )

  const choosePosition = useCallback(
    (id: string) => {
      setChosenPositionId(id)
      updateDraft({ positionTitle: positions.find((p) => p.id === id)?.title ?? '' })
    },
    [positions, updateDraft],
  )

  /**
   * Memoised because the submission depends on it: a new object on every
   * render would make its `useCallback` an empty promise.
   */
  const input: StatementTopic = useMemo(
    () =>
      creatingSubject
        ? {
            kind: 'new',
            subject,
            position: {
              positionTitle: position.title,
              positionDescription: position.description,
            },
          }
        : {
            kind: 'existing',
            subjectId: chosenSubjectId,
            position: creatingPosition
              ? {
                  kind: 'new',
                  positionTitle: position.title,
                  positionDescription: position.description,
                }
              : { kind: 'existing', id: chosenPositionId },
          },
    [chosenPositionId, chosenSubjectId, creatingPosition, creatingSubject, position, subject],
  )

  /*
   * Derived from what leaves, so the recap cannot announce anything else. A
   * new subject always carries a position to create; an existing one only
   * when it was not ticked.
   */
  const positionToCreate =
    input.kind === 'new' ? input.position : input.position.kind === 'new' ? input.position : null

  const created: Created[] = [
    ...(input.kind === 'new' ? [{ what: 'Le sujet', name: input.subject.title }] : []),
    ...(positionToCreate ? [{ what: 'La position', name: positionToCreate.positionTitle }] : []),
  ]

  return {
    subject: {
      chosen,
      choose: chooseSubject,
      creating: creatingSubject,
      startNew: startNewSubject,
      cancelNew: cancelNewSubject,
      draft: subject,
      change: changeSubject,
    },
    position: {
      options: positions,
      loading: loadingPositions,
      creating: creatingSubject || creatingPosition,
      startNew: startNewPosition,
      cancelNew: cancelNewPosition,
      draft: position,
      change: changePosition,
      chosenId: chosenPositionId,
      choose: choosePosition,
    },
    input,
    created,
  }
}
