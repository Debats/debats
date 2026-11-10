'use server'

import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import {
  CatalogueFacts,
  FieldToRevise,
  isRevisable,
  RevisableField,
  Revision,
  RevisionRequest,
  SourceReading,
  Turn,
} from '../../domain/services/draft-revision'
import { excerptAround, textOfHtml } from '../../domain/services/quote-match'
import { hostOf, isReadable, verdictFor } from '../../domain/services/source-verdict'
import { createDraftReviser } from '../../infra/ai/draft-reviser'
import { createPositionRepository } from '../../infra/database/position-repository-supabase'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import { fetchPage } from '../../infra/sources/fetch-page'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { getAdminContributor } from './admin-guard'

export type {
  CatalogueFacts,
  Choice,
  FieldChange,
  FieldToRevise,
  Revision,
  RevisionAdvice,
  SourceReading,
  Turn,
} from '../../domain/services/draft-revision'

/** What the admin form sends: itself as it stands, and what a reading needs to know */
export interface DraftToRevise {
  fields: readonly FieldToRevise[]
  locked: readonly RevisableField[]
  author: { kind: 'public_figure' | 'organisation'; found: boolean }
  /** The subject the form holds among the existing, when it does */
  subjectId?: string
  /** The words the source should carry, when the statement has words */
  quote?: string
  sourceUrl: string
  /** Whether to read the source this turn: the first turn does, a later one when asked */
  readSource: boolean
  history: readonly Turn[]
  request: string
}

export type ReviseResult =
  | {
      revised: true
      revision: Revision
      source: SourceReading | null
      /** What the site knows, so the form can name what the assistant proposes to attach to */
      catalogue: CatalogueFacts
    }
  | { revised: false; message: string }

const NOT_ALLOWED = 'Accès refusé.'
const UNAVAILABLE =
  'La relecture n’est pas disponible pour le moment. Vous pouvez amender et valider sans elle.'

/** How long a source gets to answer while a person waits on the other side */
const SOURCE_TIMEOUT_MS = 8_000
const SIMILAR_SUBJECTS = 5

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const asList = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
const asRecord = (item: unknown): Record<string, unknown> | undefined =>
  item && typeof item === 'object' ? (item as Record<string, unknown>) : undefined

/* What reaches a Server Function has no type: each field is read for what it says it is */
function asFields(value: unknown): FieldToRevise[] {
  return asList(value).flatMap((item) => {
    const record = asRecord(item)
    const field = text(record?.field)
    if (!record || !isRevisable(field)) return []
    return [{ field, label: text(record.label), value: text(record.value) }]
  })
}

const asLocked = (value: unknown): RevisableField[] => asList(value).map(text).filter(isRevisable)

function asHistory(value: unknown): Turn[] {
  return asList(value).flatMap((item) => {
    const record = asRecord(item)
    const role = text(record?.role)
    const turn = text(record?.text)
    return (role === 'user' || role === 'assistant') && turn ? [{ role, text: turn }] : []
  })
}

/* A verdict is only its kind and what that kind carries: anything else is dropped */
function asVerdict(value: unknown): SourceReading['verdict'] | undefined {
  const record = asRecord(value)
  const kind = text(record?.kind)
  const reason = text(record?.reason)
  switch (kind) {
    case 'verified':
    case 'reachable':
    case 'missing':
      return { kind }
    case 'close':
      return typeof record?.coverage === 'number' ? { kind, coverage: record.coverage } : undefined
    case 'unreachable':
    case 'unverifiable':
      return reason ? { kind, reason } : undefined
    default:
      return undefined
  }
}

/** The reading of the source a previous turn gave, as the form sends it back */
function asSource(value: unknown): SourceReading | null {
  const record = asRecord(value)
  const host = text(record?.host)
  const verdict = asVerdict(record?.verdict)
  if (!host || !verdict) return null
  const excerpt = text(record?.excerpt)
  return { host, verdict, ...(excerpt ? { excerpt } : {}) }
}

function asDraft(value: unknown): DraftToRevise {
  const record = asRecord(value)
  const author = asRecord(record?.author)
  const kind = text(author?.kind)
  return {
    fields: asFields(record?.fields),
    locked: asLocked(record?.locked),
    author: {
      kind: kind === 'organisation' ? 'organisation' : 'public_figure',
      found: author?.found === true,
    },
    subjectId: text(record?.subjectId) || undefined,
    quote: text(record?.quote) || undefined,
    sourceUrl: text(record?.sourceUrl),
    readSource: record?.readSource === true,
    history: asHistory(record?.history),
    request: text(record?.request),
  }
}

/** What the site knows of what the form names: the subject held, its positions, the subjects it could be */
async function catalogueFor(
  draft: DraftToRevise,
  subjects: ReturnType<typeof createSubjectRepository>,
  positions: ReturnType<typeof createPositionRepository>,
): Promise<CatalogueFacts> {
  const subjectTitle = draft.fields.find(({ field }) => field === 'subjectTitle')?.value ?? ''
  const [held, similar, onSubject] = await Promise.all([
    draft.subjectId ? Effect.runPromise(subjects.findById(draft.subjectId)) : null,
    subjectTitle.length >= 2
      ? Effect.runPromise(subjects.searchByTitle(subjectTitle, SIMILAR_SUBJECTS))
      : [],
    draft.subjectId ? Effect.runPromise(positions.findBySubjectId(draft.subjectId)) : [],
  ])
  return {
    author: draft.author,
    subject: held ? { found: true, id: held.id, title: held.title } : { found: false },
    similarSubjects: similar
      .filter((s) => s.id !== held?.id)
      .map(({ id, title }) => ({ id, title })),
    positions: onSubject.map(({ id, title }) => ({ id, title })),
  }
}

/** The source as a reader would report it: a verdict on the words, and the passage around them */
async function readSource(draft: DraftToRevise): Promise<SourceReading | null> {
  const { sourceUrl, quote } = draft
  if (!sourceUrl) return null
  const page = await fetchPage(sourceUrl, SOURCE_TIMEOUT_MS)
  const verdict = verdictFor({ quote }, sourceUrl, page)
  const words = 'body' in page && isReadable(page.contentType) ? textOfHtml(page.body) : undefined
  return {
    host: hostOf(sourceUrl),
    verdict,
    ...(quote && words ? { excerpt: excerptAround(quote, words) } : {}),
  }
}

/**
 * One turn of the revision of a draft with the assistant, for admins only.
 *
 * Nothing is stored: not the fields, not the turns, not the answer. The form
 * holds the conversation and sends it back each turn. A failure reaches
 * Sentry without any of it, and is told as a line that says the draft can
 * still be amended and validated by hand.
 */
export async function reviseDraft(
  input: unknown,
  previousSource: unknown = null,
): Promise<ReviseResult> {
  const contributor = await getAdminContributor()
  if (!contributor) return { revised: false, message: NOT_ALLOWED }

  const draft = asDraft(input)
  if (draft.fields.length === 0) return { revised: false, message: UNAVAILABLE }

  try {
    const supabase = createAdminSupabaseClient()
    const [catalogue, source] = await Promise.all([
      catalogueFor(draft, createSubjectRepository(supabase), createPositionRepository(supabase)),
      draft.readSource ? readSource(draft) : asSource(previousSource),
    ])
    const request: RevisionRequest = {
      fields: draft.fields,
      locked: draft.locked,
      catalogue,
      source,
      history: draft.history,
      request: draft.request,
    }
    const revision = await createDraftReviser().revise(request)
    return { revised: true, revision, source, catalogue }
  } catch (err) {
    Sentry.captureException(err, { tags: { feature: 'draft-revision' } })
    return { revised: false, message: UNAVAILABLE }
  }
}
