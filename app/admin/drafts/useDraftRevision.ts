'use client'

import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react'
import * as Sentry from '@sentry/nextjs'
import { RevisableField } from '../../../domain/services/draft-revision'
import { AdviceByField } from '../../../components/ui/FieldAdvice'
import {
  CatalogueFacts,
  Choice,
  FieldChange,
  reviseDraft,
  SourceReading,
} from '../../actions/revise-draft'
import {
  AmendValues,
  applyChanges,
  Attachable,
  FIELD_LABELS,
  fieldsToRevise,
  quoteOf,
  Revised,
  withValue,
} from './revision-fields'

/** A change the assistant made this turn, as the dialogue names it */
export interface AppliedChange {
  field: RevisableField
  label: string
}

export type DialogueTurn =
  | { role: 'user'; text: string }
  | {
      role: 'assistant'
      text: string
      applied: AppliedChange[]
      choices: readonly Choice[]
      /** What the source gave this turn, when it was read */
      source: SourceReading | null
    }

export type RevisionStatus =
  | { kind: 'idle' }
  | { kind: 'reading'; source: boolean }
  | { kind: 'unavailable'; message: string }

export interface DraftRevision {
  turns: DialogueTurn[]
  status: RevisionStatus
  suggestions: readonly string[]
  advice: AdviceByField
  /** The fields the assistant wrote over, with what they held */
  revised: Revised
  /** Ask the assistant; resolves when its answer, or its absence, is on screen */
  ask: (request: string, readSource?: boolean) => Promise<void>
  /** Take a proposal that engaged more than a field */
  choose: (choice: Choice) => void
  /** Put back what a field held before the assistant wrote over it */
  undo: (field: RevisableField) => void
  /** A person is writing this field: the assistant leaves it alone from now on */
  edited: (field: RevisableField) => void
}

interface DraftRevisionInput {
  values: AmendValues
  setValues: Dispatch<SetStateAction<AmendValues>>
  author: { kind: 'public_figure' | 'organisation'; found: boolean }
  sourceUrl: string
  /** Called when an answer is on screen: a sheet opens, a region is announced */
  onAnswered?: () => void
}

const UNREACHABLE = 'La relecture n’a pas répondu. Vous pouvez amender et valider sans elle.'

const attachableOf = (catalogue: CatalogueFacts): Attachable => ({
  subjects: [
    ...catalogue.similarSubjects,
    ...(catalogue.subject.id && catalogue.subject.title
      ? [{ id: catalogue.subject.id, title: catalogue.subject.title }]
      : []),
  ],
  positions: catalogue.positions,
})

const without = <K extends string, V>(record: Partial<Record<K, V>>, key: K) => {
  if (!(key in record)) return record
  const { [key]: _dropped, ...rest } = record
  return rest as Partial<Record<K, V>>
}

/**
 * The revision of a draft with the assistant, as the amend form holds it.
 *
 * The form is the only state: the assistant's changes are written into it
 * and remembered field by field so each can be undone; a field a person
 * writes is locked away from the assistant. The conversation lives here and
 * dies with the form. The first turn is automatic, and reads the source.
 */
export function useDraftRevision({
  values,
  setValues,
  author,
  sourceUrl,
  onAnswered,
}: DraftRevisionInput): DraftRevision {
  const [turns, setTurns] = useState<DialogueTurn[]>([])
  /* The first reading is under way from the first render: it asks nothing and reads the source */
  const [status, setStatus] = useState<RevisionStatus>({ kind: 'reading', source: true })
  const [suggestions, setSuggestions] = useState<readonly string[]>([])
  const [advice, setAdvice] = useState<AdviceByField>({})
  const [revised, setRevised] = useState<Revised>({})
  const [source, setSource] = useState<SourceReading | null>(null)
  /* What the form holds right now, for an answer that arrives after it changed */
  const latest = useRef(values)
  useEffect(() => {
    latest.current = values
  }, [values])
  const locked = useRef(new Set<RevisableField>())
  const attachable = useRef<Attachable>({ subjects: [], positions: [] })
  const started = useRef(false)

  const apply = useCallback(
    (changes: readonly FieldChange[]) => {
      const kept = changes.filter(
        ({ field }) =>
          field === 'existingSubject' || field === 'existingPosition' || !locked.current.has(field),
      )
      const applied = applyChanges(latest.current, kept, attachable.current)
      setValues(applied.values)
      setRevised((current) => ({ ...current, ...applied.revised }))
      setAdvice((current) =>
        Object.keys(applied.revised).reduce((rest, field) => without(rest, field), current),
      )
      return Object.keys(applied.revised).map((field) => ({
        field: field as RevisableField,
        label: FIELD_LABELS[field as RevisableField],
      }))
    },
    [setValues],
  )

  /** One turn: the form as it stands goes out, the answer lands in it. The status was set by the caller. */
  const turn = useCallback(
    async (request: string, readSource: boolean) => {
      const history = turns.map(({ role, text }) => ({ role, text }))
      try {
        const result = await reviseDraft(
          {
            fields: fieldsToRevise(latest.current),
            locked: Array.from(locked.current),
            author,
            subjectId: latest.current.subjectId ?? undefined,
            quote: quoteOf(latest.current.content),
            sourceUrl,
            readSource,
            history,
            request,
          },
          source,
        )
        if (!result.revised) {
          setStatus({ kind: 'unavailable', message: result.message })
          return
        }
        attachable.current = attachableOf(result.catalogue)
        setSource(result.source)
        const applied = apply(result.revision.changes)
        setAdvice((current) => ({
          ...current,
          ...Object.fromEntries(
            result.revision.advice
              .filter(({ field }) => !applied.some((a) => a.field === field))
              .map(({ field, verdict, note }) => [field, { verdict, note }]),
          ),
        }))
        setSuggestions(result.revision.suggestions)
        setTurns((current) => [
          ...current,
          {
            role: 'assistant',
            text: result.revision.reply,
            applied,
            choices: result.revision.choices,
            source: readSource ? result.source : null,
          },
        ])
        setStatus({ kind: 'idle' })
        onAnswered?.()
      } catch (err) {
        Sentry.captureException(err, { tags: { feature: 'draft-revision' } })
        setStatus({ kind: 'unavailable', message: UNREACHABLE })
      }
    },
    [apply, author, onAnswered, source, sourceUrl, turns],
  )

  const ask = useCallback(
    async (request: string, readSource = false) => {
      if (request) setTurns((current) => [...current, { role: 'user', text: request }])
      setStatus({ kind: 'reading', source: readSource })
      await turn(request, readSource)
    },
    [turn],
  )

  /* Nobody starts from a blank page: the first reading leaves with the first render */
  useEffect(() => {
    if (started.current) return
    started.current = true
    void turn('', true)
  }, [turn])

  const choose = useCallback(
    (choice: Choice) => {
      const applied = apply(choice.changes)
      setTurns((current) => [
        ...current,
        { role: 'user', text: choice.label },
        {
          role: 'assistant',
          text: applied.length > 0 ? 'Fait.' : 'Fait : le formulaire est rattaché.',
          applied,
          choices: [],
          source: null,
        },
      ])
    },
    [apply],
  )

  const undo = useCallback(
    (field: RevisableField) => {
      const previous = revised[field]
      if (previous === undefined) return
      setValues((current) => withValue(current, field, previous))
      setRevised((current) => without(current, field))
    },
    [revised, setValues],
  )

  const edited = useCallback((field: RevisableField) => {
    locked.current.add(field)
    setRevised((current) => without(current, field))
    setAdvice((current) => without(current, field))
  }, [])

  return { turns, status, suggestions, advice, revised, ask, choose, undo, edited }
}
