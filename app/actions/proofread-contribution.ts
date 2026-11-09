'use server'

import * as Sentry from '@sentry/nextjs'
import {
  ContextToRead,
  createProofreader,
  FieldAdvice,
  FieldToRead,
} from '../../infra/ai/proofreader'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type { ContextToRead, FieldAdvice, FieldToRead, Verdict } from '../../infra/ai/proofreader'

/** What the form sends: what was typed, and what was chosen among the existing */
export interface ContributionToRead {
  fields: readonly FieldToRead[]
  context: readonly ContextToRead[]
}

export type ProofreadResult =
  | { read: true; advice: readonly FieldAdvice[] }
  | { read: false; message: string }

const NOT_SIGNED_IN = 'Votre session a expiré. Reconnectez-vous pour demander une relecture.'
const UNAVAILABLE =
  'La relecture n’est pas disponible pour le moment. Votre contribution part quand vous voulez.'

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const asList = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

const asRecord = (item: unknown): Record<string, unknown> | undefined =>
  item && typeof item === 'object' ? (item as Record<string, unknown>) : undefined

/** What we agree to have read: named fields, with something in them */
function asFields(value: unknown): FieldToRead[] {
  return asList(value).flatMap((item) => {
    const record = asRecord(item)
    if (!record) return []
    const read = { field: text(record.field), label: text(record.label), value: text(record.value) }
    return read.field && read.value ? [read] : []
  })
}

/** What we agree to read against: labelled context, with something in it */
function asContext(value: unknown): ContextToRead[] {
  return asList(value).flatMap((item) => {
    const record = asRecord(item)
    if (!record) return []
    const read = { label: text(record.label), value: text(record.value) }
    return read.label && read.value ? [read] : []
  })
}

/**
 * Advice on the writing of a contribution, field by field.
 *
 * Nothing is stored, nothing is logged: neither the fields sent nor the
 * advice given. A failure reaches Sentry without them — these are drafts of a
 * contribution, and the assist was promised to leave no trace.
 *
 * Nothing is blocked either: the advice decides nothing, and a failure is
 * told by recalling that the contribution goes anyway. That is the one
 * guarantee that matters here, and it holds because no command reads what
 * this returns.
 *
 * For signed-in contributors only: it sends a request out of this server,
 * and that one costs money.
 */
export async function proofreadContribution(contribution: unknown): Promise<ProofreadResult> {
  const contributor = await getAuthenticatedContributor()
  if (!contributor) return { read: false, message: NOT_SIGNED_IN }

  const record = asRecord(contribution)
  const fields = asFields(record?.fields)
  if (fields.length === 0) return { read: true, advice: [] }

  try {
    return {
      read: true,
      advice: await createProofreader().read(fields, asContext(record?.context)),
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { feature: 'proofreading' } })
    return { read: false, message: UNAVAILABLE }
  }
}
