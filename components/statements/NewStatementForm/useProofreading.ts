'use client'

import { useCallback, useRef, useState } from 'react'
import * as Sentry from '@sentry/nextjs'
import {
  ContributionToRead,
  proofreadContribution,
} from '../../../app/actions/proofread-contribution'
import { AdviceByField } from '../../ui/FieldAdvice'
import { freshAdvice, remarksIn } from './fresh-advice'

/** Where the reading stands, for the one line that says it */
export type ProofreadingStatus =
  | { kind: 'idle' }
  | { kind: 'reading' }
  /** Done, with how many fields got something other than « conforme » */
  | { kind: 'read'; remarks: number }
  | { kind: 'unavailable'; message: string }

export interface Proofreading {
  advice: AdviceByField
  status: ProofreadingStatus
  /** A field is being written: whatever was said about it no longer applies */
  written: (field: string) => void
  /** The person left a field: if it was written since the last reading, read again */
  left: (field: string, contribution: ContributionToRead) => void
}

const UNREACHABLE = 'La relecture n’a pas répondu. Votre contribution part quand vous voulez.'

/**
 * The assisted reading, as the form holds it: an opinion per field, and a
 * status line.
 *
 * A reading is asked for when a field is left after being written, never
 * while it is typed: one call per field settled, not one per keystroke. Only
 * the latest reading answers — an earlier one still in flight is dropped,
 * since the later one read everything it had read and more. And a field
 * written while a reading was out is not the text that was read: its advice
 * is dropped, and leaving it will ask again.
 *
 * Nothing here reaches the submission. The advice lives in this state and
 * nowhere else, so it dies with the form; and a reading that fails is said in
 * one grey line, never as an error — the contribution goes anyway, and that
 * is the whole point.
 */
export function useProofreading(): Proofreading {
  const [advice, setAdvice] = useState<AdviceByField>({})
  const [status, setStatus] = useState<ProofreadingStatus>({ kind: 'idle' })
  /** The fields written since the last reading was asked for */
  const writtenSince = useRef(new Set<string>())
  /** Which reading is the latest: only its answer counts */
  const latest = useRef(0)

  const ask = useCallback(async (contribution: ContributionToRead) => {
    const reading = ++latest.current
    writtenSince.current = new Set()
    setStatus({ kind: 'reading' })
    try {
      const result = await proofreadContribution(contribution)
      if (reading !== latest.current) return
      if (!result.read) {
        setStatus({ kind: 'unavailable', message: result.message })
        return
      }
      const fresh = freshAdvice(result.advice, writtenSince.current)
      setAdvice(fresh)
      setStatus({ kind: 'read', remarks: remarksIn(fresh) })
    } catch (err) {
      if (reading !== latest.current) return
      /* The network, most likely: worth knowing, never worth stopping for */
      Sentry.captureException(err, { tags: { feature: 'proofreading' } })
      setStatus({ kind: 'unavailable', message: UNREACHABLE })
    }
  }, [])

  const written = useCallback((field: string) => {
    writtenSince.current.add(field)
    setAdvice((current) => {
      if (!(field in current)) return current
      const { [field]: _dropped, ...rest } = current
      return rest
    })
  }, [])

  const left = useCallback(
    (field: string, contribution: ContributionToRead) => {
      if (writtenSince.current.has(field)) void ask(contribution)
    },
    [ask],
  )

  return { advice, status, written, left }
}
