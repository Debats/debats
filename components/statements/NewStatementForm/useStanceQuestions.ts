'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getTakenPositions, TakenOnSubject } from '../../../app/actions/get-taken-positions'
import { StatementAuthorInput, StatementTopic } from '../../../domain/use-cases/create-statement'
import { PositionVerdict } from '../../../domain/use-cases/statement-judgements'
import { verdictIn } from '../../../domain/read-models/position-judgements'
import { StanceQuestion, stanceQuestions } from '../../../domain/read-models/stance-question'

export interface StanceQuestions {
  /** What is asked right now: empty most of the time */
  questions: StanceQuestion[]
  /** What was answered, by position; a question not answered yet has no entry */
  answers: Readonly<Record<string, boolean>>
  answer: (positionId: string, compatible: boolean) => void
  /** What the submission will carry: the answers to the questions still asked */
  input: PositionVerdict[]
}

/** What the site knows of one author on one subject, kept with the pair it was read for */
interface Read {
  key: string
  known: TakenOnSubject
}

/**
 * The question due when the author of the statement already took another
 * position on its subject: is it compatible with the one being recorded?
 *
 * Asked only of an author and a subject the site already has — one opened in
 * the same breath took nothing yet — and only of a pair nobody judged. What
 * is read is kept with the author and the subject it is about: while another
 * pair is being read, nothing stale is asked.
 */
export function useStanceQuestions(
  author: StatementAuthorInput,
  topic: StatementTopic,
  statedOn: string,
): StanceQuestions {
  const authorKind = author.kind === 'existing' ? author.author.kind : ''
  const authorId = author.kind === 'existing' ? author.author.id : ''
  const subjectId = topic.kind === 'existing' ? topic.subjectId : ''
  const key = authorId && subjectId ? `${authorKind}:${authorId}:${subjectId}` : ''

  /*
   * An answer is about two positions: the one already taken, and the one
   * being recorded for this author on this subject. Another author, subject
   * or position ticked is another question, which nothing answered yet.
   */
  const recorded =
    topic.kind !== 'existing' ? '' : topic.position.kind === 'new' ? 'new' : topic.position.id
  const scope = `${key}|${recorded}`

  const [read, setRead] = useState<Read>()
  const [answered, setAnswered] = useState<{ scope: string; values: Record<string, boolean> }>({
    scope,
    values: {},
  })
  const answers = useMemo(
    () => (answered.scope === scope ? answered.values : {}),
    [answered, scope],
  )

  useEffect(() => {
    if (!key) return
    const controller = new AbortController()
    getTakenPositions({ kind: authorKind, id: authorId }, subjectId).then((known) => {
      if (controller.signal.aborted) return
      setRead({ key, known })
    })
    return () => controller.abort()
  }, [authorId, authorKind, key, subjectId])

  const questions = useMemo(() => {
    if (!key || read?.key !== key || topic.kind !== 'existing') return []
    const { position } = topic
    return stanceQuestions(
      read.known.taken,
      verdictIn(read.known.judged),
      position.kind === 'new' ? 'new' : position.id ? { id: position.id } : null,
      statedOn,
    )
  }, [key, read, statedOn, topic])

  const answer = useCallback(
    (positionId: string, compatible: boolean) => {
      setAnswered((current) => ({
        scope,
        values: {
          ...(current.scope === scope ? current.values : {}),
          [positionId]: compatible,
        },
      }))
    },
    [scope],
  )

  const input = useMemo(
    () =>
      questions.flatMap(({ position }) =>
        position.id in answers
          ? [{ positionId: position.id, compatible: answers[position.id] }]
          : [],
      ),
    [answers, questions],
  )

  return { questions, answers, answer, input }
}
